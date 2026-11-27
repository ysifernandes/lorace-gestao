# Estuda+ — Visão geral

## Missão
Complementar (não substituir) a escola: identificar lacunas individuais por habilidade, ensinar de forma adaptativa e dar às famílias
ferramentas para rotinas saudáveis, convertendo estudo em tempo de entretenimento sob controle dos responsáveis.
Indicador de sucesso: **conhecimento adquirido, aplicado e retido** — não tempo de uso.

## Mercados
- **B2C**: famílias (planos gratuito/individual/familiar/ampliado; preços configuráveis em `plans`, sem valores no código).
- **B2B**: escolas (licença por aluno ativo, contratos, gestão de licenças). Aluno pode estar em família E escola; a escola só vê dados com **consentimento ativo** e **nunca** controla o celular pessoal.

## Perfis
Aluno · Responsável · Professor · Gestor escolar · Superadmin (enum `app.role_t`; RLS em `0005_rls.sql`).

## Mapa de funcionalidades (e status)
| Área | Status |
|---|---|
| Esquema de dados + RLS + auditoria + carteira | **Implementado e testado** (45 verificações em Postgres 16) |
| Motor pedagógico (grafo, domínio, diagnóstico adaptativo, erros, plano, revisão) | **Núcleo implementado e testado em unidade**; conteúdo real/BNCC e calibração **pendentes** |
| Gamificação (XP, níveis, carteira, minutos) | **Núcleo testado**; missões/conquistas/jogos **pendentes** |
| Controle parental — protocolo/política | **Implementado e testado** (agente simulado) |
| Controle parental — bloqueio nativo Android/iOS | **Escrito, NÃO compilado/testado** — depende de dispositivos reais; iOS depende de entitlement Apple |
| Tutor IA | **Pendente** (design em `AI_ENGINE.md`) |
| Apps mobile, portais web, design system | **Pendentes** (referência visual: a imagem anexada não foi recebida) |
| Auth real (Supabase), push FCM/APNs, filas | **Bloqueado**: precisa de projeto/credenciais |

## Fluxos principais
1. **Família**: responsável cria conta → `create_family` → cadastra filho (dados mínimos) → consentimentos → pareia dispositivo (código de uso único, 10 min) → diagnóstico → plano → missões → XP → minutos → regras parentais aplicadas no dispositivo.
2. **Comando remoto**: responsável cria regra → backend assina (HMAC por dispositivo) → push + polling → dispositivo verifica/aplica → confirma status → responsável vê estado real.
3. **Escola**: gestor cria turma/matrícula → responsável concede consentimento → professor vê heatmap/diagnóstico → aprova atividades sugeridas pela IA.
4. **Prova**: responsável/professor informa conteúdo+data → mapeia habilidades → consulta diagnóstico → plano distribuído até a data (`examPrepSchedule`) → simulado no último dia.

## Dependências externas, custos e autorizações (resumo; detalhes em ROADMAP/DEPLOYMENT)
Supabase (projeto, plano pago p/ produção/backup) · Firebase (FCM) · Apple Developer ($99/ano) + **aprovação do entitlement Family Controls (distribuição)** · Google Play Console + declaração de AccessibilityService · provedor de IA (custo por token; moderação) · OCR p/ fotos de caderno · armazenamento · monitoramento (Sentry etc.) · revisão jurídica LGPD/ECA Digital · revisão pedagógica por docentes · licenças de conteúdo.
