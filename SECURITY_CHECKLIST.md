# Checklist de segurança do Bloom Planner

Marque conforme for fazendo. "Código" significa que a correção já está no repositório; falta publicar.

## Para você decidir e fazer agora

- [ ] Publicar o banco: executar `supabase/security_hardening.sql` no SQL Editor do Supabase e testar o app com login real
- [ ] Publicar a função `social` (Verify JWT desligado) e rodar `./security-tests/api_probe.sh`
- [ ] Publicar o site (`build_app.py` + `deploy_vercel.py`) e conferir `curl -I` do seu computador
- [ ] Supabase → Authentication: senha mínima 8
- [ ] Supabase → Authentication: proteção contra senhas vazadas (exige plano Pro)
- [ ] Supabase → Authentication: CAPTCHA no cadastro e no login
- [ ] Supabase → Database → Settings: "Enforce SSL"
- [ ] Backups: contratar plano com backups diários, ou exportar o banco toda semana
- [ ] Anthropic Console: definir limite mensal de gasto e alerta
- [ ] Criar uma conta de teste confirmada em um projeto Supabase de homologação (para os itens 3, 4 e 6)

## Já resolvido (no código, testado localmente)

- [x] XSS: escape de emoji, validação de cores, ids e emojis na entrada
- [x] CSP, anti-clickjacking, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`
- [x] Biblioteca do Supabase hospedada no site, com hash (sem CDN de terceiros)
- [x] CORS da função só para o site do Bloom
- [x] SSRF no push: lista de serviços permitidos (código e banco)
- [x] Segredo do cron em tempo constante
- [x] Limites de `sync`, `push-test` e IA; corpo máximo 200 KB
- [x] Erro do banco não vaza em `/start`
- [x] Privilégios mínimos nas tabelas (SQL pronto)
- [x] Limite e nome fixo dos documentos (SQL pronto)

## Já estava certo (comprovado com teste)

- [x] RLS em todas as 12 tabelas; usuária não lê, altera, apaga nem insere dados de outra
- [x] 16 rotas da função recusam pedido sem login
- [x] Exclusão pedida pela Meta exige assinatura válida
- [x] Nenhum segredo no código nem em todo o histórico do Git
- [x] Login e recuperação de senha não revelam se o e-mail existe
- [x] Sem SQL montado por texto, sem execução de comandos
- [x] A IA não tem ferramentas nem acesso a banco

## Depois de publicar, conferir

- [ ] `api_probe.sh`: nenhuma linha `access-control-allow-origin` para `evil.example`
- [ ] `curl -I` do site mostra `content-security-policy`, `x-frame-options`, `strict-transport-security`
- [ ] Login, salvar planner, sincronizar Instagram, notificação de teste e assistente funcionam
- [ ] `/.env`, `/.git/config`, `/supabase/schema.sql` respondem 404 no site

## Antes de abrir para outras pessoas

- [ ] Oferecer autenticação em dois fatores (o Supabase já suporta TOTP)
- [ ] Criptografar os tokens do Instagram no banco (`supabase_vault` ou na função)
- [ ] Alertas: erros da função, volume de IA por pessoa, picos de login
- [ ] Roteiro de incidente: trocar segredos, revogar sessões, avisar usuárias e a Meta
- [ ] Domínio próprio de e-mail com SPF, DKIM e DMARC; incluir o domínio em `ALLOWED_ORIGINS` na função
- [ ] Atualizar `@supabase/supabase-js` (função e biblioteca hospedada), `web-push` e o SDK da Anthropic, com teste

## Quando houver cobrança (itens 41 a 50, hoje "não aplicável")

- [ ] Preço e desconto calculados só no servidor
- [ ] Webhook do provedor de pagamento com assinatura conferida
- [ ] Idempotência por evento (pagamento não processa duas vezes)
- [ ] Reembolso, cancelamento e expiração revogam o plano no servidor
- [ ] Recursos pagos autorizados no servidor, nunca só na tela
- [ ] Teste grátis limitado por e-mail confirmado
- [ ] Refazer toda esta auditoria para a parte de pagamentos
