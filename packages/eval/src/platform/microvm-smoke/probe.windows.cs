using System;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

internal static class WindowsHcsProbe
{
    private const int AfHyperV = 34;
    private const int SockStream = 1;
    private const int HvProtocolRaw = 1;
    private const int ProbePort = 4050;
    private const int WaitMilliseconds = 60000;

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    private struct WsaData
    {
        internal ushort Version;
        internal ushort HighVersion;
        internal ushort MaxSockets;
        internal ushort MaxUdpDatagram;
        internal IntPtr VendorInfo;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 257)] internal string Description;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 129)] internal string SystemStatus;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct HyperVSocketAddress
    {
        internal ushort Family;
        internal ushort Reserved;
        internal Guid VmId;
        internal Guid ServiceId;
    }

    [DllImport("computecore.dll")]
    private static extern IntPtr HcsCreateOperation(IntPtr context, IntPtr callback);

    [DllImport("computecore.dll", CharSet = CharSet.Unicode)]
    private static extern int HcsCreateComputeSystem(
        string id,
        string configuration,
        IntPtr operation,
        IntPtr securityDescriptor,
        out IntPtr computeSystem);

    [DllImport("computecore.dll", CharSet = CharSet.Unicode)]
    private static extern int HcsStartComputeSystem(
        IntPtr computeSystem,
        IntPtr operation,
        string options);

    [DllImport("computecore.dll", CharSet = CharSet.Unicode)]
    private static extern int HcsGetComputeSystemProperties(
        IntPtr computeSystem,
        IntPtr operation,
        string propertyQuery);

    [DllImport("computecore.dll", CharSet = CharSet.Unicode)]
    private static extern int HcsTerminateComputeSystem(
        IntPtr computeSystem,
        IntPtr operation,
        string options);

    [DllImport("computecore.dll")]
    private static extern int HcsWaitForOperationResult(
        IntPtr operation,
        uint timeoutMilliseconds,
        out IntPtr resultDocument);

    [DllImport("computecore.dll")]
    private static extern void HcsCloseComputeSystem(IntPtr computeSystem);

    [DllImport("computecore.dll")]
    private static extern void HcsCloseOperation(IntPtr operation);

    [DllImport("kernel32.dll")]
    private static extern IntPtr LocalFree(IntPtr memory);

    [DllImport("ws2_32.dll")]
    private static extern int WSAStartup(ushort versionRequested, out WsaData data);

    [DllImport("ws2_32.dll")]
    private static extern int WSACleanup();

    [DllImport("ws2_32.dll", SetLastError = true)]
    private static extern IntPtr socket(int addressFamily, int socketType, int protocol);

    [DllImport("ws2_32.dll", SetLastError = true)]
    private static extern int connect(
        IntPtr socketHandle,
        ref HyperVSocketAddress address,
        int addressLength);

    [DllImport("ws2_32.dll", SetLastError = true)]
    private static extern int send(IntPtr socketHandle, byte[] buffer, int length, int flags);

    [DllImport("ws2_32.dll", SetLastError = true)]
    private static extern int recv(IntPtr socketHandle, byte[] buffer, int length, int flags);

    [DllImport("ws2_32.dll")]
    private static extern int closesocket(IntPtr socketHandle);

    [DllImport("ws2_32.dll")]
    private static extern int WSAGetLastError();

    private static string EscapeJson(string value)
    {
        return value.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }

    private static string Configuration(string kernel, string initramfs)
    {
        string serviceId = ServiceId(ProbePort).ToString();
        return "{" +
            "\"Owner\":\"Vault Desk M0\"," +
            "\"SchemaVersion\":{\"Major\":2,\"Minor\":1}," +
            "\"ShouldTerminateOnLastHandleClosed\":true," +
            "\"VirtualMachine\":{" +
                "\"StopOnReset\":true," +
                "\"Chipset\":{\"LinuxKernelDirect\":{" +
                    "\"KernelFilePath\":\"" + EscapeJson(kernel) + "\"," +
                    "\"InitRdPath\":\"" + EscapeJson(initramfs) + "\"," +
                    "\"KernelCmdLine\":\"console=ttyS0 init=/sbin/init panic=-1 " +
                        "dummy.numdummies=0 initcall_blacklist=virtio_vsock_init pci=off\"}}," +
                "\"ComputeTopology\":{" +
                    "\"Memory\":{\"SizeInMB\":256,\"AllowOvercommit\":true}," +
                    "\"Processor\":{\"Count\":1}}," +
                "\"Devices\":{\"HvSocket\":{\"HvSocketConfig\":{" +
                    "\"DefaultBindSecurityDescriptor\":\"D:P(A;;FA;;;SY)(A;;FA;;;BA)\"," +
                    "\"ServiceTable\":{\"" + serviceId + "\":{" +
                        "\"AllowWildcardBinds\":true," +
                        "\"BindSecurityDescriptor\":\"D:P(A;;FA;;;WD)\"," +
                        "\"ConnectSecurityDescriptor\":\"D:P(A;;FA;;;SY)(A;;FA;;;BA)\"}}}}}}" +
            "}";
    }

    private static Guid ServiceId(int port)
    {
        return new Guid((uint)port, 0xfacb, 0x11e6, 0xbd, 0x58, 0x64, 0x00, 0x6a, 0x79, 0x86, 0xd3);
    }

    private static string Wait(IntPtr operation, string action)
    {
        IntPtr document;
        int status = HcsWaitForOperationResult(operation, WaitMilliseconds, out document);
        string result = document == IntPtr.Zero ? "" : Marshal.PtrToStringUni(document);
        if (document != IntPtr.Zero) LocalFree(document);
        if (status < 0) throw new InvalidOperationException(
            action + " failed with HRESULT 0x" + status.ToString("X8") + ": " + result);
        return result;
    }

    private static void Started(int status, string action)
    {
        if (status < 0) throw new InvalidOperationException(
            action + " did not start: HRESULT 0x" + status.ToString("X8"));
    }

    private static string Properties(IntPtr system)
    {
        IntPtr operation = HcsCreateOperation(IntPtr.Zero, IntPtr.Zero);
        try
        {
            Started(HcsGetComputeSystemProperties(system, operation, "{}"), "property query");
            return Wait(operation, "property query");
        }
        finally
        {
            HcsCloseOperation(operation);
        }
    }

    private static Guid RuntimeId(string properties)
    {
        Match match = Regex.Match(
            properties,
            "\\\"RuntimeId\\\"\\s*:\\s*\\\"(?<id>[^\\\"]+)\\\"",
            RegexOptions.IgnoreCase);
        if (!match.Success) throw new InvalidOperationException(
            "HCS properties did not include RuntimeId: " + properties);
        return new Guid(match.Groups["id"].Value);
    }

    private static IntPtr Connect(Guid runtimeId)
    {
        HyperVSocketAddress address = new HyperVSocketAddress
        {
            Family = AfHyperV,
            VmId = runtimeId,
            ServiceId = ServiceId(ProbePort)
        };
        int lastError = 0;
        for (int attempt = 0; attempt < 80; attempt++)
        {
            IntPtr handle = socket(AfHyperV, SockStream, HvProtocolRaw);
            if (handle == new IntPtr(-1)) throw new InvalidOperationException(
                "Hyper-V socket creation failed: " + WSAGetLastError());
            if (connect(handle, ref address, Marshal.SizeOf(address)) == 0) return handle;
            lastError = WSAGetLastError();
            closesocket(handle);
            Thread.Sleep(250);
        }
        throw new InvalidOperationException("Hyper-V socket connection failed: " + lastError);
    }

    private static void WriteAll(IntPtr socketHandle, byte[] bytes)
    {
        int offset = 0;
        while (offset < bytes.Length)
        {
            byte[] remaining = new byte[bytes.Length - offset];
            Buffer.BlockCopy(bytes, offset, remaining, 0, remaining.Length);
            int written = send(socketHandle, remaining, remaining.Length, 0);
            if (written <= 0) throw new InvalidOperationException(
                "Hyper-V socket write failed: " + WSAGetLastError());
            offset += written;
        }
    }

    private static byte[] ReadExact(IntPtr socketHandle, int length)
    {
        byte[] result = new byte[length];
        int offset = 0;
        while (offset < length)
        {
            byte[] remaining = new byte[length - offset];
            int received = recv(socketHandle, remaining, remaining.Length, 0);
            if (received <= 0) throw new InvalidOperationException(
                "Hyper-V socket read failed: " + WSAGetLastError());
            Buffer.BlockCopy(remaining, 0, result, offset, received);
            offset += received;
        }
        return result;
    }

    private static string Exchange(Guid runtimeId)
    {
        IntPtr socketHandle = Connect(runtimeId);
        try
        {
            byte[] payload = Encoding.UTF8.GetBytes(
                "{\"operation\":\"probe\",\"protocolVersion\":1}");
            byte[] header = BitConverter.GetBytes(IPAddress.HostToNetworkOrder(payload.Length));
            WriteAll(socketHandle, header);
            WriteAll(socketHandle, payload);
            int length = IPAddress.NetworkToHostOrder(BitConverter.ToInt32(ReadExact(socketHandle, 4), 0));
            if (length <= 0 || length > 256) throw new InvalidOperationException(
                "Guest returned an invalid frame length.");
            return Encoding.UTF8.GetString(ReadExact(socketHandle, length));
        }
        finally
        {
            closesocket(socketHandle);
        }
    }

    private static void Terminate(IntPtr system)
    {
        IntPtr operation = HcsCreateOperation(IntPtr.Zero, IntPtr.Zero);
        try
        {
            int status = HcsTerminateComputeSystem(system, operation, null);
            if (status >= 0)
            {
                try
                {
                    Wait(operation, "compute system termination");
                }
                catch (InvalidOperationException)
                {
                    // The guest normally powers itself off before host cleanup runs.
                }
            }
        }
        finally
        {
            HcsCloseOperation(operation);
        }
    }

    private static string Run(string kernel, string initramfs)
    {
        Guid id = Guid.NewGuid();
        IntPtr operation = HcsCreateOperation(IntPtr.Zero, IntPtr.Zero);
        IntPtr system = IntPtr.Zero;
        WsaData data;
        if (WSAStartup(0x0202, out data) != 0) throw new InvalidOperationException("WSAStartup failed.");
        try
        {
            Started(HcsCreateComputeSystem(
                id.ToString(), Configuration(kernel, initramfs), operation, IntPtr.Zero, out system),
                "compute system creation");
            Wait(operation, "compute system creation");
            Guid runtimeId = RuntimeId(Properties(system));
            Started(HcsStartComputeSystem(system, operation, null), "compute system start");
            Wait(operation, "compute system start");
            string response = Exchange(runtimeId);
            if (!Regex.IsMatch(response,
                "^\\{\"nonLoopbackNetworkDeviceCount\":0,\"protocolVersion\":1," +
                "\"status\":\"ok\",\"transport\":\"vsock\"\\}$"))
                throw new InvalidOperationException("Guest returned unexpected evidence: " + response);
            return "{\"networkDeviceCount\":0,\"socketDeviceCount\":1,\"guest\":" + response + "}";
        }
        finally
        {
            if (system != IntPtr.Zero)
            {
                Terminate(system);
                HcsCloseComputeSystem(system);
            }
            HcsCloseOperation(operation);
            WSACleanup();
        }
    }

    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 3 && args[0] == "--print-configuration")
            {
                Console.WriteLine(Configuration(Path.GetFullPath(args[1]), Path.GetFullPath(args[2])));
                return 0;
            }
            if (args.Length < 2 || args.Length > 3)
                throw new ArgumentException("Expected kernel, initramfs, and optional output paths.");
            string result = Run(Path.GetFullPath(args[0]), Path.GetFullPath(args[1]));
            if (args.Length == 3) File.WriteAllText(Path.GetFullPath(args[2]), result);
            else Console.WriteLine(result);
            return 0;
        }
        catch (Exception error)
        {
            if (args.Length == 3 && args[0] != "--print-configuration")
                File.WriteAllText(Path.GetFullPath(args[2]) + ".error", error.Message);
            else Console.Error.WriteLine(error.Message);
            return 1;
        }
    }
}
