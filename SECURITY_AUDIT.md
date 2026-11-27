# Auditoria de segurança do Bloom Planner

Data: 26/11/2026 · Ponto de retorno no Git: tag `security-audit-checkpoint-pre` (commit `ae9d3e3`, antes de qualquer alteração desta auditoria)

> Este relatório **não declara o aplicativo 100% seguro**. Ele lista o que foi testado, o que foi encontrado, o que foi corrigido **no código** e o que ainda depende de você.

## Como ler os status

| Status | Significado |
|---|---|
| **aprovado** | Testado ou comprovado por configuração/código, com evidência. |
| **vulnerável** | Problema confirmado e **ainda não corrigido** (precisa de decisão ou ação sua). |
| **corrigido (no código)** | Correção feita e testada **localmente**. **Ainda não foi publicada em produção**: veja "O que falta publicar". |
| **não testado** | Não foi possível testar daqui. O motivo e o que falta estão escritos. |
| **não aplicável** | O app não tem essa funcionalidade hoje. |

## O que falta publicar (precisa da sua autorização)

A auditoria pediu para **não alterar configurações de produção sem autorização**. Por isso, tudo abaixo está pronto, testado localmente e commitado, mas **não foi publicado**. O sistema de segurança do ambiente também barrou a publicação da função do servidor, como esperado.

| # | O que publicar | Como | Risco de quebrar |
|---|---|---|---|
| P1 | Site com cabeçalhos de segurança, CSP, escape de emoji/cor, biblioteca do Supabase hospedada junto | `python3 scripts/build_app.py && python3 scripts/deploy_vercel.py` | Baixo: testado com a CSP real, login funcionando |
| P2 | Função `social` (CORS, limites, push, segredos) | Deploy da função no Supabase | Baixo: testes unitários OK, mas **sem teste de integração local** (veja riscos) |
| P3 | Reforço do banco: `supabase/security_hardening.sql` | SQL Editor do Supabase | Baixo: testado em Postgres local, repetível |
| P4 | Configurações do Supabase Auth (senha mínima, vazamento de senhas, CAPTCHA, SSL do banco) | Painel do Supabase | Mudança de regra de cadastro |

## Arquitetura encontrada

| Parte | Tecnologia | Onde |
|---|---|---|
| Frontend | HTML/JS puro, um arquivo (`planner.html`, 6.100 linhas), PWA com service worker | `planner.html` → `app/index.html` (gerado por `scripts/build_app.py`) |
| Hospedagem | Vercel (projeto `bloom-planner`, pasta `app/`) | `scripts/deploy_vercel.py`, `app/vercel.json` |
| Login e banco | Supabase: Auth (e-mail e senha), Postgres com RLS, 12 tabelas | `supabase/schema.sql` |
| Backend | 1 função de borda (Deno) `social`, 16 rotas, `verify_jwt=false` (a função valida o login por conta própria) | `supabase/functions/social/index.ts` |
| Tarefas agendadas | `pg_cron`: sincronização diária e envio de lembretes a cada 5 min (segredo `x-cron-secret`) | banco |
| Integrações | Instagram/Facebook (Meta Graph API), TikTok (adiado), Anthropic (Claude), Web Push | função `social` |
| Pagamentos | **nenhum** | n/a |
| Armazenamento de arquivos | **nenhum bucket**; imagens do mural ficam dentro dos documentos do planner | n/a |

Superfícies atacáveis: (1) site estático; (2) API REST do Supabase com a chave pública (`anon`); (3) Auth do Supabase; (4) as 16 rotas da função `social`; (5) callbacks da Meta.

## Resumo dos achados

| Gravidade | Achado | Status |
|---|---|---|
| **Média** | XSS armazenado: emoji de hábitos, pastas, contagens e feriados entravam na tela sem escape (23 pontos), e cores/ids iam sem validação para atributos HTML | corrigido (no código) |
| **Média** | Qualquer usuária logada podia gravar um endereço qualquer como "push", e o servidor fazia a chamada (SSRF) | corrigido (no código e em SQL) |
| **Média** | Nenhum cabeçalho de segurança no site (sem CSP, sem anti-clickjacking) | corrigido (no código) |
| **Média** | Biblioteca do Supabase carregada de um CDN de terceiros, sem verificação de integridade | corrigido (no código) |
| **Média** | Senha mínima de 6 caracteres e proteção contra senhas vazadas desligada; sem CAPTCHA | vulnerável (precisa da sua ação) |
| **Média** | Tokens do Instagram guardados em texto puro no banco | vulnerável (risco residual) |
| **Média** | Sem backups automáticos do banco | vulnerável (precisa da sua ação) |
| **Média** | Sem limite global de gasto com a IA e cadastro aberto | vulnerável (risco residual) |
| **Baixa** | Banco aceita conexão direta sem exigir SSL | vulnerável (precisa da sua ação) |
| **Baixa** | CORS `*` na função do servidor | corrigido (no código) |
| **Baixa** | Permissões excessivas nas tabelas (`anon` e `authenticated` com INSERT/DELETE/TRUNCATE; só a RLS barrava) | corrigido (em SQL) |
| **Baixa** | Rotas `sync` e `push-test` sem limite de uso; limite da IA com corrida | corrigido (no código) |
| **Baixa** | Comparação do segredo do cron não era em tempo constante; erro do banco vazava em `/start` | corrigido (no código) |
| **Baixa** | Sem limite de tamanho dos documentos no banco | corrigido (em SQL) |
| **Baixa** | Cadastro com e-mail de conta **não confirmada** devolve o id dessa conta | vulnerável (comportamento do Supabase) |
| **Baixa** | `@supabase/auth-js` com aviso de rota insegura (afeta só funções de administração, que o app não usa de forma exposta) | vulnerável (atualização recomendada) |
| **Info** | Sem monitoramento, alertas ou registro de auditoria | vulnerável (recomendação) |

**Pontos fortes confirmados com teste:** as 12 tabelas têm RLS, e uma "atacante" simulada **não leu, não alterou, não apagou e não inseriu** dados de outra usuária; as 16 rotas da função recusam pedidos sem login; o pedido de exclusão da Meta só é aceito com assinatura válida; não há segredos no código nem em todo o histórico do Git; o login não revela se um e-mail existe.

---

## As 60 verificações

Legenda de local: `P` = `planner.html`, `F` = `supabase/functions/social/index.ts`, `S` = `supabase/schema.sql`, `H` = `supabase/security_hardening.sql`, `V` = `app/vercel.json` (gerado em `scripts/build_app.py`).

### 1. Autenticação e contas

| # | Verificação | Status | Gravidade | Local | Evidência (sem segredos) | Correção / resultado | Risco residual |
|---|---|---|---|---|---|---|---|
| 1 | E-mails não verificados | aprovado | informativa | Auth (config) | `mailer_autoconfirm=false`, `mailer_allow_unverified_email_sign_ins=false`. Login de conta não confirmada responde "Email not confirmed" (tratado em `P:1861`). | n/a | Nenhum conhecido. |
| 2 | Senhas comprometidas | **vulnerável** | média | Auth (config), `P:1856`, `P:1798` | `password_min_length=6`, `password_hibp_enabled=false`, sem exigência de tipos de caractere. | Não alterado (é configuração de produção). Recomendo mínimo 8 e proteção contra vazamentos (HIBP, que no Supabase exige plano Pro). O app também checa 6 no navegador. | Senhas como `123456` são aceitas hoje. |
| 3 | Sessões após troca de senha | não testado | média | Auth | `security_update_password_require_reauthentication=false`; `sessions_single_per_user=false`. Teste exige uma conta de teste **confirmada** em ambiente de homologação. | n/a | Quem roubou uma sessão pode continuar com ela até o token expirar (1 h) e a renovação ser recusada. Falta: conta de teste confirmada. |
| 4 | Excesso de tentativas de login | não testado | média | Auth | `security_captcha_enabled=false`. Os limites de tentativas do Supabase são os padrões do serviço e não aparecem na configuração; não fiz força bruta em produção. | n/a | Sem CAPTCHA, ataque automatizado depende só dos limites padrão. |
| 5 | Recuperação de senha | aprovado | informativa | `P:1845` | Pedido para e-mail inexistente responde `200` (igual ao de e-mail existente); a tela mostra mensagem única. `redirect` limitado à lista permitida (`uri_allow_list` só o site do Bloom). | n/a | Depende do e-mail do usuário não estar comprometido. |
| 6 | Expiração e uso único dos tokens | não testado | média | Auth | `mailer_otp_exp=3600` (1 h). O uso único precisa de um e-mail real de recuperação. O app trata link usado/expirado (`P:1789`). | n/a | Falta teste real do link. |
| 7 | Tomada de contas de outras pessoas | aprovado | informativa | `F:96`, RLS | Atacante simulada (outro `uid`) leu 0 linhas em 12 tabelas, alterou/apagou 0 linhas, e inserir em nome da vítima foi recusado pela RLS. O servidor sempre usa o `id` do token validado, nunca um id enviado pelo app. O `state` do OAuth é de uso único e ligado à usuária. | n/a | Veja itens 2, 3 e 4. |
| 8 | Autenticação em dois fatores | não aplicável | informativa | n/a | O app não oferece 2FA. O Supabase tem TOTP habilitado (`mfa_totp_enroll_enabled=true`), mas não há tela. | n/a | Recomendo oferecer 2FA antes de vender. |
| 9 | Descobrir e-mails cadastrados | aprovado | baixa | Auth | Login com e-mail inexistente e com e-mail existente (senha errada) devolve a **mesma** resposta `invalid_credentials`. Recuperação devolve `200` nos dois. Observação: cadastrar de novo um e-mail de conta **ainda não confirmada** devolve os dados dessa conta (incluindo o id). Para conta confirmada, o Supabase devolve resposta ofuscada (documentado; não testei com conta confirmada). | n/a | O id de uma conta não confirmada pode ser visto por quem tentar cadastrar o mesmo e-mail. |
| 10 | Cookies, JWTs e sessão | aprovado | informativa | `P:1771` | Sem cookies. A sessão fica no `localStorage` (padrão do supabase-js), com `jwt_exp=3600` e rotação de token ligada. Roubar a sessão exigiria XSS, que a CSP e as correções do item 34 reduzem. | CSP em `V` | Se houver um XSS no futuro, a sessão pode ser lida. |

### 2. APIs e permissões

| # | Verificação | Status | Gravidade | Local | Evidência | Correção / resultado | Risco residual |
|---|---|---|---|---|---|---|---|
| 11 | Rotas como `/api/usuarios` | aprovado | informativa | n/a | Não existe rota assim. A API REST do Supabase, consultada com a chave pública e sem login, devolveu `[]` para todas as 12 tabelas. O endpoint de administração do Auth respondeu `403 not_admin`. | n/a | Nenhum. |
| 12 | APIs sem autenticação | aprovado | informativa | `F:803-992` | `security-tests/api_probe.sh` (produção): 11 rotas de usuária → `401`; `push-tick` e `sync` com segredo errado ou ausente → `401`; `data-deletion`/`deauthorize` sem assinatura → `400`. | n/a | Nenhum. |
| 13 | Acesso a dados de outras pessoas | aprovado | informativa | `S`, RLS | Testes de leitura, alteração e exclusão como atacante simulada, na produção (revertidos) e no banco local. Controle positivo: a dona vê os próprios 4 documentos. | n/a | Nenhum. |
| 14 | Usuária comum virar administradora | aprovado | informativa | n/a | O app não tem papéis nem painel administrativo. A usuária logada não acessa `auth/admin` (`403`). A chave de serviço só existe dentro da função. | n/a | Quando existir um painel administrativo, refazer este teste. |
| 15 | Permissão validada no servidor | aprovado | informativa | `F:96`, RLS | Toda rota chama `userFrom` e o banco aplica RLS. O navegador não decide quem é a usuária. | n/a | Nenhum. |
| 16 | Manipular ids de usuário, pedido, produto | aprovado | informativa | `F:221` | `choose` só aceita `ext_id` que existe em `social_choices` **da própria usuária**. Atualizar linha de outra usuária afeta 0 linhas. Não há pedidos nem produtos. | n/a | Nenhum. |
| 17 | SQL Injection | aprovado | informativa | `F` inteiro, `P` | Nenhum SQL montado por texto: só o cliente do Supabase com parâmetros. Busca por `.rpc(`, `exec(`, SQL cru: nada. | n/a | Nenhum. |
| 18 | NoSQL Injection | não aplicável | informativa | n/a | O banco é Postgres. Os documentos são JSON em texto, nunca consultados por operadores vindos da usuária. | n/a | Nenhum. |
| 19 | Command Injection | aprovado | informativa | `F` | Sem `Deno.Command`, `eval`, `new Function` ou execução de comandos em `F` e `P`. | n/a | Nenhum. |
| 20 | Requisições excessivas e abuso | **corrigido (no código)** | média | `F:528`, `F:895`, `F:979`, `F:82` | Antes: só a IA tinha limite (40/dia), com checagem e registro separados (corrida); `sync` (dezenas de chamadas à Meta por pedido) e `push-test` sem limite; corpo JSON sem limite de tamanho. | `sync`: 1 vez por minuto por pessoa; `push-test`: 1 a cada 30 s; IA registra primeiro e confere depois; corpo máx. 200 KB. Teste do código em `security-tests/edge_units.cjs` (parte) e revisão. **Sem teste de integração local da função.** | Cadastro aberto permite criar várias contas (veja item 55). Limites do Supabase Auth são os padrões. |

### 3. Banco de dados e arquivos

| # | Verificação | Status | Gravidade | Local | Evidência | Correção / resultado | Risco residual |
|---|---|---|---|---|---|---|---|
| 21 | Banco exposto publicamente | **vulnerável** | baixa | Supabase (config) | Conexão direta ao Postgres permitida de qualquer IP (`0.0.0.0/0`, padrão do Supabase) e **SSL não obrigatório** (`ssl-enforcement: database=false`). Exige a senha do banco. | Não alterado (configuração de produção). Recomendo ligar "Enforce SSL" e, se possível, restringir IPs. | Um vazamento da senha do banco teria impacto total. |
| 22 | RLS e políticas por usuária | aprovado + **corrigido (em SQL)** | baixa | `S`, `H:20-31` | RLS ligado em 12/12 tabelas, 6 políticas, todas por `auth.uid() = user_id`. Mas `anon` e `authenticated` tinham INSERT/UPDATE/DELETE/TRUNCATE em todas (padrão do Supabase), barrados só pela RLS. As políticas de `ai_jobs` e `social_daily` valiam para `public`. | `security_hardening.sql`: tira tudo de `anon`, deixa `authenticated` com o mínimo, políticas só para `authenticated`. 54 verificações no Postgres local, **antes** e **depois**, repetível. **Não aplicado em produção.** | Depois de aplicar, testar o app uma vez com login real. |
| 23 | Credenciais em mensagens de erro | **corrigido (no código)** | baixa | `F:812` | `/start` devolvia `detail: error.message` do banco. O restante devolve códigos genéricos (`server_error`, `db`). Os logs não gravam tokens (busca por log com `token/secret/key`). | Removido o `detail`. | O app mostra `Não deu certo: <mensagem do Supabase Auth>` no login (`P:1865`); são mensagens do Auth, sem segredos. |
| 24 | Hash de senhas | não testado | informativa | Auth | O app **nunca** guarda senha (nem em `S`, nem em `P`). O hash é feito pelo Supabase Auth; não consigo ler os hashes daqui para provar o algoritmo. | n/a | Delegado ao Supabase. |
| 25 | Fotos, vídeos e documentos privados públicos | aprovado | informativa | Storage | `storage.buckets` está vazio. Imagens do mural ficam dentro do documento `vision`, protegido por RLS. Miniaturas do Instagram são URLs da própria Meta. | n/a | Nenhum. |
| 26 | Upload de arquivos | não aplicável | informativa | n/a | Não há upload para servidor. Imagens são lidas no navegador e guardadas no documento. | Limite de 8 MB por documento e nomes fixos (`core`, `maps`, `vision`, `biz`) em `H:46`. | Sem o SQL aplicado, um documento pode crescer sem limite. |
| 27 | Acesso indevido a diretórios | aprovado (pacote) / não testado (ao vivo) | informativa | `scripts/deploy_vercel.py` | O deploy publica **só** arquivos de `app/`, ignora arquivos que começam com ponto e subpastas. `supabase/`, `docs/` e `.git` não vão. Não consegui consultar o site ao vivo daqui (o proxy bloqueia o domínio). | n/a | Falta testar `/.env`, `/.git/config` ao vivo. |
| 28 | Dados apagados continuam acessíveis | aprovado | informativa | `S` | Todas as tabelas têm `references auth.users on delete cascade`; "Excluir conta" chama `deleteUser`; "desconectar" apaga conexão, token e posts importados; a exclusão pela Meta apaga e registra o pedido. | n/a | Não há backups para conter cópias (item 29). |
| 29 | Segurança dos backups | **vulnerável** | média | Supabase (config) | `database/backups`: lista vazia, `pitr_enabled=false`. Não há backups automáticos para recuperar de erro ou ataque. | Não alterado (depende do plano). Recomendo plano com backups diários ou exportar o banco regularmente. | Perda total de dados é possível. |
| 30 | Criptografia de dados sensíveis | **vulnerável** | média | `S:37-45`, `S:106-117` | Em trânsito: HTTPS. Em repouso: o disco do Supabase é criptografado pelo serviço (não verificável daqui). **Tokens do Instagram ficam em texto puro** nas colunas `access_token`, `alt_token`, `user_token`. Só a função do servidor lê, mas quem tiver acesso ao banco os lê. | Não corrigido: exige chave de criptografia nova e migração em produção. Recomendado: `supabase_vault`/`pgsodium` ou criptografia na função. | Vazamento do banco expõe tokens do Instagram de todos. |

### 4. Frontend e código-fonte

| # | Verificação | Status | Gravidade | Local | Evidência | Correção / resultado | Risco residual |
|---|---|---|---|---|---|---|---|
| 31 | Chaves de API no JavaScript | aprovado | informativa | `app/index.html` | Só há a chave pública `anon` (o JWT decodificado mostra `role: anon`) e a chave pública VAPID. Busca por padrões de chaves (Anthropic, Meta, Supabase, GitHub, AWS, chaves privadas) no código e em **todo o histórico do Git**: nenhuma. | n/a | A chave `anon` é pública por desenho; a segurança vem da RLS. |
| 32 | `.env` e configurações privadas | aprovado | informativa | repo | Nenhum `.env`, `.pem`, credencial ou token versionado em nenhum commit (54 commits). Segredos ficam nos "Secrets" da função. | n/a | Nenhum. |
| 33 | Código confidencial do backend | aprovado | informativa | deploy | O código da função e o SQL não estão em `app/`. | n/a | Falta conferir ao vivo (item 27). |
| 34 | XSS | **corrigido (no código)** | média | `P` (23 pontos), `P:1619` | **Antes:** teste dinâmico (`security-tests/xss_dom.js`) com carga maliciosa em todos os textos do estado e 380 cliques por 22 telas, em desktop e celular: injeção confirmada nas telas de hábitos, conteúdo, gravar e metas. Causa: `${x.emoji}` sem `esc()` em 23 lugares; cores e ids em atributos sem validação. **Depois:** 0 injeções, 0 erros de página. Controle positivo: a carga aparece como texto, e o detector acha uma injeção proposital. Também testado: plano do assistente (texto vindo da IA). | `esc()` nos 23 pontos; `sanitizeState()` em `migrate()` valida cores, ids, emojis e remove `__proto__`; `onerror` em linha trocado por ouvinte; CSP bloqueia scripts injetados. | Gravidade real é menor porque cada pessoa só vê os próprios dados, mas um backup importado ou documento adulterado seria o caminho. Os ~680 outros pontos de interpolação passaram pelo teste dinâmico, não por revisão linha a linha. |
| 35 | CSRF | aprovado | informativa | `F` | A autenticação é por cabeçalho `Authorization` (não por cookie), então outro site não consegue usar a sessão. O `state` do OAuth é de uso único, ligado à usuária. | n/a | Nenhum. |
| 36 | CORS | **corrigido (no código)** | baixa | `F:64`, `F:1023` | Produção devolve `access-control-allow-origin: *` (teste `api_probe.sh`). | Só os dois endereços do Bloom e `APP_URL` recebem o cabeçalho. Teste ao vivo **após publicar** ainda é necessário. | Sem teste de integração local da função. |
| 37 | Clickjacking | **corrigido (no código)** | média | `V` | Antes: nenhum `X-Frame-Options` nem `frame-ancestors` (o `vercel.json` só tinha cache). | `X-Frame-Options: DENY` e `frame-ancestors 'none'`. Testado com servidor local aplicando `vercel.json`. | Confirmar o cabeçalho ao vivo depois de publicar. |
| 38 | Dependências | vulnerável | baixa | `F:26-28` | `npm audit` das 3 dependências: 2 avisos **baixos** (`@supabase/auth-js`, rota insegura com entrada malformada em funções de administração). Versões mais novas existem (supabase-js 2.119, web-push 4.0, SDK da Anthropic 1.14). O CDN de terceiros (jsdelivr) **foi removido**: a biblioteca está em `app/supabase-js.2.45.4.umd.js`, hash conferido com o registro do npm. | Não atualizei as versões (risco de regressão sem teste de integração). | 2 avisos baixos; versões desatualizadas. |
| 39 | Logs e depuração | aprovado | informativa | `F`, `P:6120` | Nenhum log grava token, segredo ou chave. O gancho de teste `window.__bloom` só existe em `file://`. | n/a | Logs da função guardam mensagens de erro da Meta. |
| 40 | Manipulação pelo navegador | aprovado | informativa | `F` | Limites da IA, tamanho dos campos enviados, escolha de conta do Instagram e login são decididos no servidor. Os dados do planner são da própria pessoa por desenho. | Limite de tamanho do documento (em SQL). | Sem o SQL, a pessoa pode gravar documentos grandes. |

### 5. Pagamentos, assinaturas e regras comerciais

O Bloom **não tem pagamentos, planos, cupons, licenças, recursos pagos nem webhooks de pagamento hoje**. Estas verificações ficam como **não aplicável** e **devem ser refeitas assim que a cobrança existir**.

| # | Verificação | Status | Observação |
|---|---|---|---|
| 41 | Abuso de período gratuito | não aplicável | Não existe teste grátis. Ao criar cobrança, vincular ao e-mail confirmado e a um limite por pessoa. |
| 42 | Plano pago mantido após reembolso | não aplicável | Quando existir, o servidor deve receber o evento de reembolso do provedor e revogar. |
| 43 | Benefícios após cancelamento/expiração | não aplicável | Idem. |
| 44 | Manipulação de preços e descontos | não aplicável | Preço deve vir sempre do servidor, nunca do app. |
| 45 | Liberar produto sem pagamento confirmado | não aplicável | Liberar só por confirmação assinada do provedor. |
| 46 | Autenticidade dos webhooks | aprovado (os que existem) | Os únicos webhooks são os da Meta (`F:1000`). `parseSignedRequest` (`F:753`) confere HMAC-SHA256: 5 testes unitários (válido, payload alterado, segredo errado, sem segredo, lixo) e a produção recusa pedido sem assinatura (`400`). Webhook de pagamento: não existe. |
| 47 | Pagamento processado duas vezes | não aplicável | Use chave de idempotência por evento. |
| 48 | Versões modificadas do app | não aplicável | O app é web; o servidor não confia no navegador (item 40). |
| 49 | Compartilhamento de licenças | não aplicável | Não há licenças. |
| 50 | Recursos premium com autorização no servidor | não aplicável | Hoje os únicos recursos "caros" (IA) já são limitados no servidor, por usuária. |

### 6. Inteligência artificial e infraestrutura

| # | Verificação | Status | Gravidade | Local | Evidência | Correção / resultado | Risco residual |
|---|---|---|---|---|---|---|---|
| 51 | Prompt Injection direta e indireta | não testado (dinâmico) | baixa | `F:508-560`, `F:600+` | Por código: as instruções ficam no `system`, os dados da pessoa vão como JSON no turno de usuário, os campos são cortados (200 a 6.000 caracteres) e a resposta é forçada num esquema JSON. A IA **não tem ferramentas**, então injeção só pode mudar o texto que volta para a própria pessoa. Texto indireto (legendas do Instagram) também passa pelo mesmo esquema e é escapado na tela (item 34). Não chamei a IA de produção com ataques (exigiria login e gastaria créditos). | n/a | Texto enganoso gerado pela IA é possível. Sem dano a outras pessoas. |
| 52 | IA revelar prompts, credenciais ou dados privados | aprovado (por código) | informativa | `F` | O prompt do sistema não é segredo e **não contém credenciais**; a chave da Anthropic só existe no ambiente da função e nunca entra no pedido. A IA só recebe o que a própria pessoa envia. | n/a | Prompt de sistema pode ser revelado (sem impacto). |
| 53 | IA acessar dados de outras pessoas | aprovado | informativa | `F` | A IA não consulta banco nem ferramentas. `ai_jobs` só é lido pela dona (RLS: atacante simulada leu 0 linhas). | n/a | Nenhum. |
| 54 | IA executar ações sem permissão | aprovado | informativa | `F` | Sem chamada de funções/ferramentas: a saída só é gravada em `ai_jobs` e vira uma notificação para a própria dona. | n/a | Nenhum. |
| 55 | Abuso de créditos e recursos | **vulnerável** (parcial) | média | `F:528` | Limite de 40 pedidos por dia por pessoa (corrida corrigida no código). Cada pedido pode usar até 16.000 tokens de saída no modelo mais caro. O cadastro é aberto (confirmação por e-mail, 30 e-mails/h). Não há teto global de gasto. | Corrida corrigida (no código). | Muitas contas falsas × 40 pedidos. Recomendo teto de gasto no painel da Anthropic e CAPTCHA no cadastro. |
| 56 | SPF, DKIM e DMARC | não testado | baixa | e-mail | O ambiente não permite consultas DNS externas (bloqueadas). Os e-mails saem pelo SMTP do Gmail com o remetente `usebloomplanner@gmail.com`, então valem os registros do Google. Não há domínio próprio. | n/a | Ao criar um domínio próprio, configurar SPF/DKIM/DMARC e refazer a verificação. |
| 57 | HTTPS, TLS e cabeçalhos | **corrigido (no código)** / não testado ao vivo | média | `V` | Cabeçalhos ausentes (item 37). HTTPS e HSTS da Vercel não puderam ser consultados daqui. | CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP` em `V`. Teste local: login funciona, 0 violações legítimas, e a CSP **bloqueou** script em linha, script externo e atributo `onerror` injetados. | Verificar cabeçalhos e certificado ao vivo depois de publicar. `style-src` ainda aceita `unsafe-inline`. |
| 58 | Portas, serviços e painéis expostos | não testado | baixa | infra | Varredura de portas não é adequada em serviços gerenciados e o ambiente bloqueia. Pelo painel: o Postgres aceita conexão direta de qualquer IP sem SSL obrigatório (item 21). Não há painel administrativo próprio. | n/a | Veja item 21. |
| 59 | Integrações, webhooks e serviços conectados | **corrigido (no código)** (parte) | média | `F:416`, `F:74` | SSRF confirmado: uma usuária comum gravou `http://169.254.169.254/...` como endereço de push e o banco aceitou (teste revertido); o servidor chamaria esse endereço. Segredo do cron comparado sem tempo constante. Webhooks da Meta: assinatura OK. | Lista de serviços de push permitidos (`F:416`) com 17 testes unitários (aceita Chrome, Firefox, Safari e Windows; recusa endereço interno, `http`, porta, usuário na URL, domínios parecidos) e restrição no banco (`H:39`) testada no Postgres local; comparação em tempo constante (`F:74`). | Tokens do Instagram em texto puro (item 30). O token vai na URL das chamadas à Meta (padrão da Meta). |
| 60 | Monitoramento, auditoria e resposta a incidentes | **vulnerável** | baixa | infra | Só existem os logs da função e do Auth no painel do Supabase. Não há alertas, tabela de auditoria nem plano de resposta documentado. | Não implementado. | Um abuso ou vazamento pode passar despercebido. Recomendo alertas de erro, de volume de IA e de logins, e um roteiro simples de incidente (trocar segredos, revogar sessões, avisar usuárias e a Meta). |

---

## O que não consegui verificar (e o que falta)

| Item | O que falta |
|---|---|
| 3, 4, 6 (sessões, tentativas de login, link de recuperação) | Um **ambiente de homologação** do Supabase, ou sua autorização para eu criar uma conta de teste confirmada e apagá-la depois. |
| 21, 27, 33, 37, 57, 58 ao vivo | Acesso ao domínio do site a partir daqui (hoje o proxy bloqueia) ou rodar `security-tests/api_probe.sh` e `curl -I` do seu computador depois de publicar. |
| 24 | Só dá para provar o algoritmo de hash com acesso ao projeto do Supabase Auth (é um serviço gerenciado). |
| 51 | Teste dinâmico da IA com texto malicioso: exige login de teste e gasta créditos da Anthropic. |
| 56 | Consulta DNS (SPF, DKIM, DMARC) do domínio de e-mail, quando houver um domínio próprio. |
| Função `social` | Não há `deno` neste ambiente. As correções da função foram **compiladas** (esbuild) e as funções puras foram **testadas**, mas as rotas não puderam ser exercitadas localmente. Depois de publicar, rode `security-tests/api_probe.sh` para confirmar. |

## Limites desta auditoria

- Não foram usados Semgrep, OWASP ZAP, Gitleaks nem Trivy: não estão instalados e o download é bloqueado aqui, e enviar o código a serviços externos exigiria sua autorização. No lugar: varredura própria de padrões de segredos em todo o histórico do Git, `npm audit`, teste dinâmico de XSS com navegador, simulação de papéis no Postgres e sondagem da API. Detalhes em `SECURITY_TESTS.md`.
- Testei produção apenas com pedidos de leitura, pedidos que devem ser recusados e transações revertidas. Um pedido de cadastro foi enviado para a caixa do Bloom (`usebloomplanner+teste1@gmail.com`, conta de teste não confirmada que já existia).
- Os testes de interface rodaram em `file://`, sem o login real do Supabase.
