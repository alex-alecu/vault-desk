#!/usr/bin/python3
import base64
import json
import os
import pathlib
import resource
import signal
import socket
import struct
import subprocess
import sys
import time

PORT = 4050
MAX_REQUEST_BYTES = 256 * 1024
MAX_RESPONSE_BYTES = 64 * 1024 * 1024
MAX_ARTIFACT_BYTES = 8 * 1024 * 1024
MAX_ARTIFACT_TOTAL_BYTES = 8 * 1024 * 1024
MAX_LOG_BYTES = 1_000_000
NOBODY = 65534


def restrict_executables():
    allowed = {
        pathlib.Path("/usr/bin/python3").resolve(),
        pathlib.Path("/usr/bin/node").resolve(),
    }
    protected = set()
    for directory in ["/bin", "/sbin", "/usr/bin", "/usr/sbin"]:
        for path in pathlib.Path(directory).glob("*"):
            try:
                target = path.resolve()
                if target not in allowed and target not in protected and target.is_file():
                    target.chmod(0o700)
                    protected.add(target)
            except OSError:
                continue


def read_exact(connection, size):
    chunks = []
    remaining = size
    while remaining:
        chunk = connection.recv(remaining)
        if not chunk:
            raise RuntimeError("socket_closed")
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)


def read_frame(connection):
    size = struct.unpack(">I", read_exact(connection, 4))[0]
    if size < 1 or size > MAX_REQUEST_BYTES:
        raise RuntimeError("invalid_frame")
    return json.loads(read_exact(connection, size))


def write_frame(connection, value):
    payload = json.dumps(value, separators=(",", ":"), sort_keys=True).encode()
    if len(payload) > MAX_RESPONSE_BYTES:
        raise RuntimeError("output_limit")
    connection.sendall(struct.pack(">I", len(payload)) + payload)


def block_devices():
    names = [item.name for item in pathlib.Path("/sys/class/block").glob("vd*")]
    return [pathlib.Path("/dev") / name for name in sorted(names, key=lambda name: (len(name), name))]


def safe_name(value):
    name = pathlib.Path(value).name
    if not name or name in {".", ".."}:
        name = "input"
    return name


def prepare_workspace(request):
    scratch_bytes = request["limits"]["scratchBytes"]
    if scratch_bytes < 1024 * 1024:
        raise RuntimeError("scratch_limit")
    pathlib.Path("/work").mkdir(mode=0o700, exist_ok=True)
    subprocess.run(
        ["/bin/mount", "-t", "tmpfs", "-o", f"size={scratch_bytes},mode=0700", "tmpfs", "/work"],
        check=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    inputs_dir = pathlib.Path("/work/inputs")
    artifacts_dir = pathlib.Path("/work/artifacts")
    inputs_dir.mkdir(mode=0o755)
    artifacts_dir.mkdir(mode=0o770)
    devices = block_devices()
    inputs = request["inputs"]
    input_device_count = max((item["deviceIndex"] for item in inputs), default=-1) + 1
    if len(devices) != input_device_count + 1:
        raise RuntimeError("device_count_mismatch")
    for item in inputs:
        byte_length = item["byteLength"]
        device_index = item["deviceIndex"]
        byte_offset = item["byteOffset"]
        if device_index < 0 or device_index >= input_device_count or byte_offset < 0:
            raise RuntimeError("invalid_input_location")
        destination = inputs_dir / safe_name(item["name"])
        with devices[device_index].open("rb", buffering=0) as source, destination.open("xb") as target:
            source.seek(byte_offset)
            remaining = byte_length
            while remaining:
                chunk = source.read(min(remaining, 1024 * 1024))
                if not chunk:
                    raise RuntimeError("input_truncated")
                target.write(chunk)
                remaining -= len(chunk)
        destination.chmod(0o444)
    os.chown("/work", NOBODY, NOBODY)
    os.chown(artifacts_dir, NOBODY, NOBODY)
    return inputs_dir, artifacts_dir


def limit_process(request):
    limits = request["limits"]
    memory = min(limits["memoryBytes"], 8 * 1024 * 1024 * 1024)
    output = min(limits["outputBytes"], MAX_ARTIFACT_TOTAL_BYTES)
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    resource.setrlimit(resource.RLIMIT_FSIZE, (output, output))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
    resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    resource.setrlimit(resource.RLIMIT_AS, (memory, memory))
    os.setgroups([])
    os.setgid(NOBODY)
    os.setuid(NOBODY)


def collect_artifacts(root):
    output = []
    total = 0
    for path in sorted(root.rglob("*")):
        if path.is_symlink() or not path.is_file():
            continue
        size = path.stat().st_size
        if size > MAX_ARTIFACT_BYTES or total + size > MAX_ARTIFACT_TOTAL_BYTES or len(output) == 16:
            break
        relative = path.relative_to(root).as_posix()
        output.append(
            {
                "name": relative,
                "mediaType": "application/octet-stream",
                "bytesBase64": base64.b64encode(path.read_bytes()).decode("ascii"),
            }
        )
        total += size
    return output


def execute(request):
    inputs_dir, artifacts_dir = prepare_workspace(request)
    language = request["language"]
    suffix = ".py" if language == "python" else ".mjs"
    script = pathlib.Path("/work") / f"task{suffix}"
    script.write_text(request["code"], encoding="utf-8")
    script.chmod(0o444)
    command = ["/usr/bin/python3", str(script)] if language == "python" else ["/usr/bin/node", str(script)]
    environment = {
        "HOME": "/work",
        "LANG": "C.UTF-8",
        "PATH": "/usr/bin:/bin",
        "VAULT_INPUT_DIR": str(inputs_dir),
        "VAULT_ARTIFACT_DIR": str(artifacts_dir),
    }
    started = time.monotonic()
    stdout_path = pathlib.Path("/work/stdout.log")
    stderr_path = pathlib.Path("/work/stderr.log")
    termination = "completed"
    with stdout_path.open("xb") as stdout_file, stderr_path.open("xb") as stderr_file:
        process = subprocess.Popen(
            command,
            cwd="/work",
            env=environment,
            stdin=subprocess.DEVNULL,
            stdout=stdout_file,
            stderr=stderr_file,
            start_new_session=True,
            preexec_fn=lambda: limit_process(request),
        )
        try:
            process.wait(timeout=request["limits"]["wallTimeMs"] / 1000)
        except subprocess.TimeoutExpired:
            termination = "timeout"
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
    output_limit = min(request["limits"]["outputBytes"], MAX_LOG_BYTES)
    stdout = stdout_path.read_bytes()[:output_limit]
    stderr = stderr_path.read_bytes()[:output_limit]
    if termination == "completed" and (
        stdout_path.stat().st_size >= request["limits"]["outputBytes"]
        or stderr_path.stat().st_size >= request["limits"]["outputBytes"]
    ):
        termination = "resource_limit"
    return {
        "language": language,
        "code": request["code"],
        "exitCode": max(0, min(255, process.returncode if process.returncode >= 0 else 255)),
        "stdout": stdout[:output_limit].decode("utf-8", "replace"),
        "stderr": stderr[:output_limit].decode("utf-8", "replace"),
        "durationMs": int((time.monotonic() - started) * 1000),
        "termination": termination if process.returncode == 0 or termination != "completed" else "crash",
        "artifacts": collect_artifacts(artifacts_dir),
    }


def interface_count():
    return len([path for path in pathlib.Path("/sys/class/net").iterdir() if path.name != "lo"])


def main():
    listener = socket.socket(socket.AF_VSOCK, socket.SOCK_STREAM)
    listener.bind((socket.VMADDR_CID_ANY, PORT))
    listener.listen(1)
    connection, _ = listener.accept()
    with connection:
        request = read_frame(connection)
        if request.get("protocolVersion") != 1 or request.get("operation") != "execute":
            raise RuntimeError("unsupported_operation")
        restrict_executables()
        result = {
            "protocolVersion": 1,
            "requestId": request["requestId"],
            "status": "ok",
            "nonLoopbackNetworkDeviceCount": interface_count(),
            "transport": "vsock",
            "execution": execute(request),
        }
        write_frame(connection, result)
    listener.close()


try:
    main()
except Exception as error:
    print(f"agent guest failed: {error}", file=sys.stderr, flush=True)
finally:
    os.sync()
    subprocess.run(["/sbin/poweroff", "-f"], check=False)
