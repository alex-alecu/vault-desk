// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "vault-vz-helper",
    platforms: [.macOS(.v26)],
    products: [.executable(name: "vault-vz-helper", targets: ["vault-vz-helper"])],
    targets: [.executableTarget(name: "vault-vz-helper")]
)
