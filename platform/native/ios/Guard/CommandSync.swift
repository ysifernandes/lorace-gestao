// NÃO COMPILADO / NÃO TESTADO EM DISPOSITIVO. Sincronização iOS: heartbeat → buscar → verificar (CryptoKit) → aplicar (ShieldController) → confirmar.
// Credenciais no Keychain (App Group compartilhado com as extensões). APNs (push silencioso) apenas acorda o app; BGAppRefreshTask é a rede de segurança.
import Foundation
import CryptoKit
import BackgroundTasks

struct Credentials { let deviceId: String, token: String, key: String }

enum VerifyResult: Equatable { case ok, rejected(String) }

enum CommandVerifier {
    static func verify(canonical: String, signatureHex: String, deviceKey: String, deviceId: String, bodyDeviceId: String,
                       issuedAt: Int64, expiresAt: Int64, nonce: String, now: Int64, seen: inout Set<String>) -> VerifyResult {
        let mac = HMAC<SHA256>.authenticationCode(for: Data(canonical.utf8), using: SymmetricKey(data: Data(deviceKey.utf8)))
        let expected = Data(mac), given = Data(hex: signatureHex)
        guard expected.count == given.count, zip(expected, given).reduce(0, { $0 | ($1.0 ^ $1.1) }) == 0 else { return .rejected("bad_signature") }  // tempo constante
        guard bodyDeviceId == deviceId else { return .rejected("wrong_device") }
        guard issuedAt - 60_000 <= now else { return .rejected("not_yet_valid") }
        guard now <= expiresAt else { return .rejected("expired") }
        guard seen.insert(nonce).inserted else { return .rejected("replay") }   // persistir `seen` (Keychain/App Group)
        return .ok
    }
}
extension Data { init(hex: String) { var d = Data(); var i = hex.startIndex; while i < hex.endIndex { let j = hex.index(i, offsetBy: 2); d.append(UInt8(hex[i..<j], radix: 16) ?? 0); i = j }; self = d } }

@MainActor
final class CommandSync {
    static let taskId = "br.edu.platform.guard.refresh"
    let base: URL, creds: Credentials, shield = ShieldController()
    init(base: URL, creds: Credentials) { self.base = base; self.creds = creds }

    func syncOnce() async {
        do {
            try await post("devices/\(creds.deviceId)/heartbeat", ["capabilities": ["usageAccess": shield.isAuthorized, "enforcement": shield.isAuthorized]])
            // TODO: GET /devices/:id/commands → para cada envelope: canonicalizar o body (mesma regra do TS), verificar,
            // ack "received"; se !shield.isAuthorized → ack "permission_unavailable"; senão aplicar (block/unblock/grant) e ack.
            // Erros de rede: não confirmar nada; reagendar via BGAppRefreshTask (iOS decide o horário — não é garantido).
        } catch { /* offline: tentará no próximo ciclo */ }
    }
    private func post(_ path: String, _ json: [String: Any]) async throws {
        var r = URLRequest(url: base.appendingPathComponent(path)); r.httpMethod = "POST"
        r.setValue("Bearer \(creds.token)", forHTTPHeaderField: "Authorization"); r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        r.httpBody = try JSONSerialization.data(withJSONObject: json); _ = try await URLSession.shared.data(for: r)
    }
    static func schedule() { let req = BGAppRefreshTaskRequest(identifier: taskId); req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60); try? BGTaskScheduler.shared.submit(req) }
}
