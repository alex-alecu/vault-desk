import Darwin
import Foundation
import Virtualization

enum HelperError: Error {
    case invalidArguments
    case invalidFrame
    case socketClosed
    case socketUnavailable
}

struct Arguments {
    let kernel: URL
    let initramfs: URL
    let cpuCount: Int
    let memoryBytes: UInt64
    let scratch: URL
    let inputs: [URL]
}

func parseArguments() throws -> Arguments {
    var values: [String: String] = [:]
    var inputs: [URL] = []
    var index = 1
    while index < CommandLine.arguments.count {
        let key = CommandLine.arguments[index]
        guard index + 1 < CommandLine.arguments.count else { throw HelperError.invalidArguments }
        let value = CommandLine.arguments[index + 1]
        if key == "--input" {
            inputs.append(URL(fileURLWithPath: value))
        } else {
            values[key] = value
        }
        index += 2
    }
    guard let kernel = values["--kernel"], let initramfs = values["--initramfs"],
          let cpuText = values["--cpus"], let cpuCount = Int(cpuText),
          let memoryText = values["--memory"], let memoryBytes = UInt64(memoryText),
          let scratch = values["--scratch"] else {
        throw HelperError.invalidArguments
    }
    return Arguments(
        kernel: URL(fileURLWithPath: kernel),
        initramfs: URL(fileURLWithPath: initramfs),
        cpuCount: cpuCount,
        memoryBytes: memoryBytes,
        scratch: URL(fileURLWithPath: scratch),
        inputs: inputs
    )
}

func readExact(count: Int, from descriptor: Int32) throws -> Data {
    var data = Data(count: count)
    var offset = 0
    while offset < count {
        let received = data.withUnsafeMutableBytes { buffer in
            Darwin.read(descriptor, buffer.baseAddress!.advanced(by: offset), count - offset)
        }
        if received > 0 {
            offset += received
        } else if received == 0 {
            throw HelperError.socketClosed
        } else if errno != EINTR {
            throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
        }
    }
    return data
}

func writeAll(_ data: Data, to descriptor: Int32) throws {
    try data.withUnsafeBytes { buffer in
        var offset = 0
        while offset < data.count {
            let written = Darwin.write(
                descriptor,
                buffer.baseAddress!.advanced(by: offset),
                data.count - offset
            )
            if written > 0 {
                offset += written
            } else if written == 0 {
                throw HelperError.socketClosed
            } else if errno != EINTR {
                throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
            }
        }
    }
}

func writeFrame(_ payload: Data, to descriptor: Int32) throws {
    guard !payload.isEmpty, payload.count <= 4096 else { throw HelperError.invalidFrame }
    let length = UInt32(payload.count)
    let header = Data([
        UInt8(length >> 24),
        UInt8((length >> 16) & 0xff),
        UInt8((length >> 8) & 0xff),
        UInt8(length & 0xff),
    ])
    try writeAll(header, to: descriptor)
    try writeAll(payload, to: descriptor)
}

func readFrame(from descriptor: Int32) throws -> Data {
    let header = try readExact(count: 4, from: descriptor)
    let length = header.reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
    guard length > 0, length <= 4096 else { throw HelperError.invalidFrame }
    return try readExact(count: Int(length), from: descriptor)
}

@MainActor
func connectWithRetry(_ device: VZVirtioSocketDevice) async throws -> VZVirtioSocketConnection {
    var lastError: Error = HelperError.socketUnavailable
    for _ in 0..<80 {
        do {
            return try await device.connect(toPort: 4050)
        } catch {
            lastError = error
            try await Task.sleep(for: .milliseconds(250))
        }
    }
    throw lastError
}

func storageDevices(_ arguments: Arguments) throws -> [VZStorageDeviceConfiguration] {
    var devices: [VZStorageDeviceConfiguration] = []
    for input in arguments.inputs {
        let attachment = try VZDiskImageStorageDeviceAttachment(url: input, readOnly: true)
        devices.append(VZVirtioBlockDeviceConfiguration(attachment: attachment))
    }
    if (try arguments.scratch.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0) > 0 {
        let attachment = try VZDiskImageStorageDeviceAttachment(
            url: arguments.scratch,
            readOnly: false
        )
        devices.append(VZVirtioBlockDeviceConfiguration(attachment: attachment))
    }
    return devices
}

func configuration(_ arguments: Arguments) throws -> VZVirtualMachineConfiguration {
    let bootLoader = VZLinuxBootLoader(kernelURL: arguments.kernel)
    bootLoader.initialRamdiskURL = arguments.initramfs
    bootLoader.commandLine = "console=hvc0 init=/sbin/init panic=-1 dummy.numdummies=0"
    let serialPort = VZVirtioConsoleDeviceSerialPortConfiguration()
    serialPort.attachment = VZFileHandleSerialPortAttachment(
        fileHandleForReading: nil,
        fileHandleForWriting: FileHandle.standardError
    )
    let result = VZVirtualMachineConfiguration()
    result.bootLoader = bootLoader
    result.cpuCount = arguments.cpuCount
    result.memorySize = arguments.memoryBytes
    result.entropyDevices = [VZVirtioEntropyDeviceConfiguration()]
    result.networkDevices = []
    result.serialPorts = [serialPort]
    result.socketDevices = [VZVirtioSocketDeviceConfiguration()]
    result.storageDevices = try storageDevices(arguments)
    try result.validate()
    return result
}

@main
struct VaultVirtualizationHelper {
    @MainActor
    static func main() async throws {
        let arguments = try parseArguments()
        let machineConfiguration = try configuration(arguments)
        let virtualMachine = VZVirtualMachine(configuration: machineConfiguration)
        try await virtualMachine.start()
        guard let socket = virtualMachine.socketDevices.first as? VZVirtioSocketDevice else {
            throw HelperError.socketUnavailable
        }
        let connection = try await connectWithRetry(socket)
        let request: [String: Any] = [
            "jobId": "00000000-0000-4000-8000-000000000001",
            "operation": "probe",
            "protocolVersion": 1,
            "requestId": "m1-probe",
        ]
        try writeFrame(
            JSONSerialization.data(withJSONObject: request, options: [.sortedKeys]),
            to: connection.fileDescriptor
        )
        let guest = try JSONSerialization.jsonObject(
            with: readFrame(from: connection.fileDescriptor)
        ) as? [String: Any]
        connection.close()
        if virtualMachine.canStop {
            try await virtualMachine.stop()
        }
        let scratchSize = try arguments.scratch.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        let result: [String: Any] = [
            "classification": "certified",
            "guest": guest ?? [:],
            "networkDeviceCount": machineConfiguration.networkDevices.count,
            "readOnlyInputCount": arguments.inputs.count,
            "scratchBytes": scratchSize,
            "socketDeviceCount": machineConfiguration.socketDevices.count,
        ]
        let output = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        FileHandle.standardOutput.write(output)
        FileHandle.standardOutput.write(Data([0x0A]))
    }
}
