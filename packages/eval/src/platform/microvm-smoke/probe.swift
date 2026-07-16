import Darwin
import Foundation
import Virtualization

enum ProbeError: Error {
    case invalidArguments
    case invalidFrame
    case socketClosed
    case socketUnavailable
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
            throw ProbeError.socketClosed
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
                throw ProbeError.socketClosed
            } else if written < 0 && errno != EINTR {
                throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
            }
        }
    }
}

func writeFrame(_ payload: Data, to descriptor: Int32) throws {
    guard payload.count <= 256 else { throw ProbeError.invalidFrame }
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
    guard length > 0, length <= 256 else { throw ProbeError.invalidFrame }
    return try readExact(count: Int(length), from: descriptor)
}

@MainActor
func connectWithRetry(_ device: VZVirtioSocketDevice) async throws -> VZVirtioSocketConnection {
    var lastError: Error = ProbeError.socketUnavailable
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

func configuration(kernel: URL, initramfs: URL) throws -> VZVirtualMachineConfiguration {
    let bootLoader = VZLinuxBootLoader(kernelURL: kernel)
    bootLoader.initialRamdiskURL = initramfs
    bootLoader.commandLine = "console=hvc0 init=/sbin/init panic=-1 dummy.numdummies=0"

    let serialPort = VZVirtioConsoleDeviceSerialPortConfiguration()
    serialPort.attachment = VZFileHandleSerialPortAttachment(
        fileHandleForReading: nil,
        fileHandleForWriting: FileHandle.standardError
    )

    let result = VZVirtualMachineConfiguration()
    result.bootLoader = bootLoader
    result.cpuCount = 1
    result.memorySize = 256 * 1024 * 1024
    result.entropyDevices = [VZVirtioEntropyDeviceConfiguration()]
    result.networkDevices = []
    result.serialPorts = [serialPort]
    result.socketDevices = [VZVirtioSocketDeviceConfiguration()]
    try result.validate()
    return result
}

@main
struct Probe {
    @MainActor
    static func main() async throws {
        guard CommandLine.arguments.count == 3 else { throw ProbeError.invalidArguments }
        let kernel = URL(fileURLWithPath: CommandLine.arguments[1])
        let initramfs = URL(fileURLWithPath: CommandLine.arguments[2])
        let machineConfiguration = try configuration(kernel: kernel, initramfs: initramfs)
        let virtualMachine = VZVirtualMachine(configuration: machineConfiguration)
        try await virtualMachine.start()

        guard let socket = virtualMachine.socketDevices.first as? VZVirtioSocketDevice else {
            throw ProbeError.socketUnavailable
        }
        let connection = try await connectWithRetry(socket)
        let request = try JSONSerialization.data(
            withJSONObject: ["operation": "probe", "protocolVersion": 1],
            options: [.sortedKeys]
        )
        try writeFrame(request, to: connection.fileDescriptor)
        let response = try JSONSerialization.jsonObject(
            with: readFrame(from: connection.fileDescriptor)
        ) as? [String: Any]
        connection.close()

        let result: [String: Any] = [
            "guest": response ?? [:],
            "networkDeviceCount": machineConfiguration.networkDevices.count,
            "socketDeviceCount": machineConfiguration.socketDevices.count,
        ]
        let output = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
        FileHandle.standardOutput.write(output)
        FileHandle.standardOutput.write(Data([0x0A]))
    }
}
