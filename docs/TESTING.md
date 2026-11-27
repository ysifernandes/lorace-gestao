# Testes

| Camada | Comando | Resultado atual |
|---|---|---|
| Unidade (pedagogia, gamificação, parental, segurança, tipos) | `pnpm test` | 44 testes OK (3 arquivos) |
| Protocolo PoC (HTTP real em porta efêmera, agente simulado) | idem (`tests/poc`) | 8 OK |
| Typecheck estrito | `pnpm typecheck` | OK |
| Banco: migrations + RLS + triggers | `pnpm test:db` | 45 verificações OK (Postgres 16) |
| Android/iOS nativo | — | **não executados** (sem SDK/Xcode/dispositivos) |
| E2E apps/web, acessibilidade, carga, pentest, usabilidade com famílias/professores | — | **pendentes** |
Princípio: testes de segurança (isolamento, forja, replay, escalada) fazem parte da suíte padrão. Falhas reais encontradas pelos testes ficam registradas no CHANGELOG.
