// NÃO COMPILADO / NÃO TESTADO EM DISPOSITIVO (sem Xcode neste ambiente).
// Requer: entitlement com.apple.developer.family-controls (solicitar à Apple p/ distribuição), iOS 16+,
// criança em Família (Compartilhamento Familiar) e autorização do responsável. Ver docs/PARENTAL_CONTROL.md.
import FamilyControls
import ManagedSettings
import DeviceActivity

@MainActor
final class ShieldController {
    private let store = ManagedSettingsStore()

    /// Autorização como dispositivo de criança (o responsável aprova via Compartilhamento Familiar).
    func requestAuthorization() async throws {
        try await AuthorizationCenter.shared.requestAuthorization(for: .child)
    }
    var isAuthorized: Bool { AuthorizationCenter.shared.authorizationStatus == .approved }   // reportado no heartbeat → enforcement

    /// iOS NÃO expõe lista de apps por pacote: o responsável escolhe via FamilyActivityPicker e recebemos tokens opacos.
    func block(_ selection: FamilyActivitySelection) {
        store.shield.applications = selection.applicationTokens
        store.shield.applicationCategories = .specific(selection.categoryTokens)
    }
    func unblock() {
        store.shield.applications = nil
        store.shield.applicationCategories = nil
    }
    /// Concessão temporária: libera agora e agenda reaplicação via DeviceActivity (monitor roda em extensão, mesmo com o app fechado).
    func grant(minutes: Int, selection: FamilyActivitySelection) throws {
        unblock()
        let now = Calendar.current.dateComponents([.hour, .minute, .second], from: Date())
        let end = Calendar.current.dateComponents([.hour, .minute, .second], from: Date().addingTimeInterval(Double(minutes) * 60))
        try DeviceActivityCenter().startMonitoring(DeviceActivityName("grant"),
            during: DeviceActivitySchedule(intervalStart: now, intervalEnd: end, repeats: false))
        // A extensão DeviceActivityMonitor.intervalDidEnd reaplica o shield (ver DeviceActivityMonitorExtension.swift).
        // Observação: intervalos curtos (<15 min) têm restrições do sistema — validar em dispositivo.
    }
}
