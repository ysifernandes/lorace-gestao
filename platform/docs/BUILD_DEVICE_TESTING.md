# Compilar e testar o controle parental em dispositivos físicos

> Nada em `native/` foi compilado ou executado. Este guia é o caminho para validar.

## Pré-requisitos
- **Android**: Android Studio (Koala+), JDK 17, 1 aparelho físico (Android 10+; ideal testar também Xiaomi/Samsung por causa de otimização de bateria). Projeto Firebase (FCM) → `google-services.json` (não versionar).
- **iOS**: Mac com Xcode 15+, iPhone iOS 16+ **da criança** em Compartilhamento Familiar (conta iCloud infantil) + iPhone do responsável. Conta Apple Developer. Entitlement `com.apple.developer.family-controls` (desenvolvimento: automático no perfil de dev; **distribuição: solicitar à Apple**). Capabilities: Family Controls, App Groups, Background Modes (fetch, remote-notification), Push.
- **Backend**: `pnpm install && pnpm --filter ... ` (hoje: PoC em memória, `Backend.listen()` em `services/backend`). Para o aparelho enxergar o servidor use a rede local (IP do computador) ou túnel HTTPS — Android exige HTTPS fora de debug (configurar `networkSecurityConfig` só em debug).

## Android — passo a passo
1. Criar projeto Android Studio, copiar `native/android/app/src/**`, ajustar `build.gradle.kts`, `API_BASE_URL`, `applicationId` (brand).
2. Rodar `./gradlew testDebugUnitTest` → `VectorsTest` deve passar (canonicalização/HMAC idênticos ao TS). **Se falhar, não prossiga.**
3. Instalar no aparelho da criança. Conceder: Acesso a uso, Serviço de acessibilidade (tela de divulgação proeminente é obrigatória antes), isenção de otimização de bateria.
4. Parear: responsável gera código (`POST /pairing/start`), aparelho conclui (`/pairing/complete`) e grava credenciais (`PolicyStore.saveCredentials`).
5. Executar o checklist de `docs/PARENTAL_CONTROL.md` (itens 1–8). Registrar resultado em `docs/TESTING.md`.
## iOS — passo a passo
1. Criar projeto Xcode com targets: app, DeviceActivityMonitor, ShieldAction, ShieldConfiguration; copiar `native/ios/**`; configurar App Group e entitlements.
2. `AuthorizationCenter.shared.requestAuthorization(for: .child)` no aparelho da criança; o responsável aprova via Compartilhamento Familiar.
3. Responsável seleciona apps com `FamilyActivityPicker`; persistir `FamilyActivitySelection` no App Group.
4. Validar: shield aplica/remove; concessão de 15 min reaplica via monitor; modo avião; reinício. **Perguntas em aberto a responder em dispositivo**: tokens do picker no aparelho do responsável valem no da criança? Menor intervalo aceito pelo DeviceActivity?
## O que registrar
Modelo/SO do aparelho, versão do app, cada item do checklist (passou/falhou/observação), logs do `command_events`. Falhas viram issues e entram em `ROADMAP.md`.
