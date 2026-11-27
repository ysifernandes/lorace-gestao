# Correções de segurança do Bloom Planner

Ponto de retorno antes das mudanças: tag `security-audit-checkpoint-pre` (commit `ae9d3e3`). Para ver tudo o que mudou: `git diff security-audit-checkpoint-pre`. Para voltar: `git checkout security-audit-checkpoint-pre`.

**Importante: nada abaixo foi publicado em produção.** Está no código, testado localmente e commitado. Veja "Como publicar" no fim.

## Resumo

| # | Correção | Item(ns) | Arquivo | Testado como | Em produção? |
|---|---|---|---|---|---|
| F1 | Escape de emoji em 23 pontos da tela | 34 | `planner.html` | `xss_dom.js`: de 400 injeções para 0 | Não |
| F2 | `sanitizeState()`: valida cores, ids, emojis e remove chaves perigosas de tudo que entra no app (nuvem, aparelho, backup) | 34, 40 | `planner.html:1619` | `xss_dom.js` | Não |
| F3 | `onerror` em linha trocado por ouvinte (a CSP não permite atributo em linha) | 34, 57 | `planner.html:1763` | `csp_check.js` | Não |
| F4 | Biblioteca do Supabase hospedada no próprio site, versão fixa, com hash (SRI); CDN de terceiros removido | 38, 57 | `planner.html:1770`, `app/supabase-js.2.45.4.umd.js`, `app/sw.js` | `csp_check.js`: login funciona; tarball conferido com o hash do npm | Não |
| F5 | Cabeçalhos de segurança: CSP com hash dos scripts do app, `X-Frame-Options`, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP` | 10, 34, 37, 57 | `scripts/build_app.py` → `app/vercel.json` | `csp_check.js`: bloqueou 3 injeções propositais, 0 violações legítimas | Não |
| F6 | Script da página de exclusão de dados movido para arquivo (a CSP bloqueia script em linha) | 57 | `app/exclusao.js`, `app/exclusao-de-dados.html` | revisão; mesma CSP | Não |
| F7 | CORS só para o site do Bloom (era `*`) | 36 | `supabase/functions/social/index.ts:64,1023` | compilação; **sem teste de rota local** | Não |
| F8 | Lista de serviços de push permitidos (impede SSRF) | 59 | `index.ts:416` | 17 testes unitários | Não |
| F9 | Comparação do segredo do cron em tempo constante | 59 | `index.ts:74` | 4 testes unitários | Não |
| F10 | `sync` no máximo 1×/min; `push-test` 1 a cada 30 s; limite da IA sem corrida; corpo JSON até 200 KB | 20, 55 | `index.ts:82,528,895,979` | compilação; **sem teste de rota local** | Não |
| F11 | `/start` não devolve mais a mensagem de erro do banco | 23 | `index.ts:812` | revisão | Não |
| F12 | Cabeçalhos `nosniff` e `Referrer-Policy` nas respostas da função | 57 | `index.ts:1023` | compilação | Não |
| F13 | Banco: `anon` sem nenhum acesso; `authenticated` só com o necessário; tabelas novas fechadas; políticas só para logadas; push só de serviços conhecidos; documentos com nome fixo e limite de 8 MB | 22, 26, 40, 59 | `supabase/security_hardening.sql` | `db_local.cjs`: 54 verificações, antes e depois, rodando duas vezes | Não |

## Detalhes

### F1, F2, F3: XSS (item 34)

**Antes.** O teste `security-tests/xss_dom.js` colocou uma carga maliciosa (`"><img src=x onerror=...>`) em todos os textos do estado do app e percorreu as 22 telas clicando em 380 elementos, em desktop e celular. Houve injeção nas telas de hábitos, conteúdo, gravar e metas. Causa: o emoji de hábitos, pastas, contagens e feriados entrava na tela com `${x.emoji}` **sem** `esc()`. Cores e ids também iam direto para atributos (`style="--c:${cor}"`, `data-cf="${id}"`).

**Depois.**
- `esc()` em 23 pontos (troca automática de `${a.b.emoji}` por `${esc(a.b.emoji)}`; conferido que não sobrou nenhum).
- `sanitizeState()` roda em `migrate()`, por onde passam os dados da nuvem, do aparelho e de backup importado: cor fora de um formato seguro vira `#c2185b`; ids só com letras, números e `_:.-`; emoji até 16 caracteres; `__proto__`, `constructor` e `prototype` são removidos.
- O único `onerror="..."` em linha virou `data-rm` com um ouvinte.
- Resultado: **0 injeções** nas duas telas e **0 erros de página**. Controle: a carga chega à tela como texto, e o detector acha uma injeção colocada de propósito.

**Limite:** o teste mostra que **não há injeção nos dados e telas exercitados**; os outros ~680 pontos de interpolação foram cobertos pelo teste dinâmico, não por revisão de cada linha.

### F4, F5, F6: Site (itens 10, 34, 37, 38, 57)

- A CSP (`script-src 'self'` + hash dos dois scripts em linha) faz o navegador **recusar** qualquer script injetado. `scripts/build_app.py` calcula os hashes a cada build e escreve `app/vercel.json`, então a política acompanha o código.
- `connect-src` lista só o Supabase, o Open-Meteo e o geocoding. Imagens aceitam `https:` (miniaturas do Instagram vêm de vários domínios da Meta).
- Resultado do teste local (`security-tests/csp_check.js`, servidor local aplicando o `vercel.json`): o login aparece; a biblioteca carrega do próprio site; um login falso recebe "E-mail ou senha incorretos." (o app fala com o Supabase sob a CSP); script em linha, script de `evil.example` e `onerror` injetados foram **bloqueados**; nenhuma violação legítima.
- **Ainda aceita** `style-src 'unsafe-inline'`, porque o app usa muito `style=""`. Risco baixo (injeção de CSS).

### F7 a F12: Função do servidor

Mudanças em `supabase/functions/social/index.ts`. A comparação de resultado: baseline em produção com `security-tests/api_probe.sh` (CORS `*`, 11 rotas de usuária `401`, cron `401`, Meta `400`).

**Sem `deno` aqui, não consegui rodar as rotas localmente.** O que foi feito: compilação com esbuild (sem erro) e 26 testes unitários das funções puras, extraídas do próprio arquivo. A integração (CORS por origem, limites) só será confirmada rodando `api_probe.sh` depois da publicação.

Pontos de atenção do comportamento novo:
- `sync` do app responde `{ok:true, throttled:true}` se a última sincronização foi há menos de 1 minuto. O app já trata a resposta como sucesso.
- `push-test` responde `429 too_fast` dentro de 30 s.
- Se o app for aberto por um endereço que não esteja na lista (`ALLOWED_ORIGINS`), o navegador bloqueará as chamadas. Hoje a lista tem `APP_URL`, `bloom-planner-nine` e `bloom-planner-yasmin17`. **Ao criar um domínio próprio, acrescente-o.**

### F13: Banco

`supabase/security_hardening.sql`. Rodado em um Postgres local (PGlite) com os papéis `anon`, `authenticated`, `service_role` e os privilégios padrão do Supabase:
- **Antes:** `anon` e `authenticated` tinham privilégio de escrita em tudo (só a RLS barrava), e um endereço de push interno era aceito.
- **Depois:** 12 tabelas inacessíveis para `anon`; 6 tabelas só do servidor inacessíveis para `authenticated`; leitura apenas em 4 tabelas; `TRUNCATE` negado; o app continua funcionando (leitura e gravação dos próprios documentos, registrar/remover push em Chrome, Firefox e Safari); 7 endereços de push maliciosos recusados; nome de documento inválido e documento acima de 8 MB recusados, 2 MB aceito; o servidor continua lendo tokens e gravando uso da IA; o script roda duas vezes sem erro.
- Os maiores documentos hoje em produção têm 156 KB, muito abaixo do limite.

## Não corrigido (e por quê)

| Item | Por quê |
|---|---|
| 2, 4 (senha fraca, sem CAPTCHA) | Configuração do Auth em produção: precisa da sua autorização. |
| 21 (SSL do banco), 29 (backups) | Configuração e plano do Supabase em produção. |
| 30 (tokens do Instagram em texto puro) | Exige chave de criptografia nova e migração de dados reais. Fazer com calma, com backup. |
| 38 (versões das dependências) | Atualizar sem teste de integração tem risco de quebrar. |
| 55 (teto global de gasto da IA) | Configuração no painel da Anthropic. |
| 60 (monitoramento) | Projeto próprio: alertas e roteiro de incidente. |

## Como publicar (na ordem)

1. **Banco primeiro**: abra o SQL Editor do Supabase, cole `supabase/security_hardening.sql` e execute. Depois entre no app e confira que carrega e salva.
2. **Função**: publique `supabase/functions/social/index.ts` (mantendo "Verify JWT" desligado, como está). Depois rode `./security-tests/api_probe.sh`: precisa mostrar `401` nas rotas de usuária, `400` nas da Meta, e **nenhum** `access-control-allow-origin` para `evil.example`.
3. **Site**: `python3 scripts/build_app.py && python3 scripts/deploy_vercel.py`. Depois confira, do seu computador, `curl -I https://bloom-planner-yasmin17.vercel.app/` (deve ter `content-security-policy`, `x-frame-options`, `strict-transport-security`) e abra o app com login real.
4. **Auth** (painel do Supabase → Authentication): senha mínima 8, proteção contra senhas vazadas (se o plano permitir), CAPTCHA, "Enforce SSL" no banco.

Se algo quebrar, o site volta pela Vercel (promover o deploy anterior) e a função pelo botão de versões do Supabase.
