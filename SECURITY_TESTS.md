# Testes de segurança do Bloom Planner

Todos os testes automatizados estão em `security-tests/`. Eles **não enviam código nem dados para serviços externos** e **não alteram a produção** (os que tocam a produção só fazem leitura, pedidos que devem ser recusados ou transações revertidas).

## Como rodar

```bash
# precisa de: node, playwright, e (para os dois últimos) esbuild e @electric-sql/pglite
npm i --no-save esbuild @electric-sql/pglite      # numa pasta de trabalho; use NODE_PATH=<pasta>/node_modules
node security-tests/xss_control.js                # controle do teste de XSS
node security-tests/xss_dom.js                    # XSS dinâmico (22 telas, ~390 cliques, 2 tamanhos de tela)
node security-tests/csp_check.js                  # CSP e cabeçalhos de segurança (precisa de internet só para o login falso)
node security-tests/edge_units.cjs                # funções de segurança da função do servidor (26 testes)
node security-tests/db_local.cjs                  # banco em Postgres local, antes e depois do reforço (54 verificações)
./security-tests/api_probe.sh                     # sondagem da função em PRODUÇÃO (só pedidos que devem ser recusados)
```

Os testes de regressão de interface (`unify`, `order`, `goals`, `layout`, `overflow`, `allmodals`, `plan`, `assist`, `pulse`, `view`, `share`, `ins`) ficam na pasta de trabalho da sessão e **passaram sem erros** depois de todas as mudanças (sem erros de página, sem rolagem horizontal, nenhuma janela mais larga que a tela).

## Resultados

| Teste | Itens | Resultado | Evidência |
|---|---|---|---|
| `xss_dom.js` **antes das correções** | 34 | **FALHOU**: 400 injeções | Elementos injetados em hábitos (`.hname .em`, `.hb-week .em`, tabela do mês), conteúdo (chips e pílulas de pasta) e gravar (detalhe do cartão). Causa: `emoji` sem `esc()`. |
| `xss_dom.js` **depois** | 34 | **passou**: 0 injeções, 0 erros de página | 22 telas, 388 cliques, desktop e celular. Inclui plano do assistente e do mês (texto vindo da IA). |
| `xss_control.js` | 34 | passou | A carga aparece como **texto** na tela (o teste enxerga os dados) e o detector acha uma injeção colocada de propósito (o teste enxerga injeções). |
| `csp_check.js` | 10, 34, 37, 57 | passou | Login visível; biblioteca carregada do próprio site; login falso → "E-mail ou senha incorretos." (fala com o Supabase sob a CSP); script em linha, script de domínio externo e `onerror` injetados **bloqueados**; 0 violações legítimas; 6 cabeçalhos presentes. |
| `edge_units.cjs` | 46, 59 | passou (26/26) | `safeEq` (4), endereços de push (4 aceitos, 13 recusados), `parseSignedRequest` da Meta (5: válido, payload alterado, segredo errado, sem segredo, lixo). O código é extraído do próprio `index.ts`. |
| `db_local.cjs` **antes** do reforço | 22, 59 | confirmou os problemas | `anon` e `authenticated` com privilégio de escrita em tabelas só do servidor; endereço de push interno **aceito**. |
| `db_local.cjs` **depois** | 22, 26, 40, 59 | passou (54/54) | `anon` negado em 12 tabelas; `authenticated` negado em 6 tabelas só do servidor; sem `DELETE` em 4 tabelas só de leitura; `TRUNCATE` negado; o app continua lendo e gravando; push malicioso recusado; documento inválido ou acima de 8 MB recusado; script SQL roda duas vezes. |
| `api_probe.sh` (produção, **antes**) | 11, 12, 36 | passou, com 1 achado | 11 rotas de usuária → `401`; `push-tick`/`sync` com segredo errado ou ausente → `401`; Meta sem assinatura → `400`; callback com `state` falso → `400`; rota inexistente → `404`. **Achado:** `access-control-allow-origin: *`. |
| `api_probe.sh` (produção, **depois**) | 36 | **pendente** | A função corrigida não foi publicada. Rodar de novo depois da publicação: o esperado é nenhuma linha `access-control-allow-origin` para `evil.example`. |

## Testes feitos direto na produção (somente leitura ou recusados)

| O que | Resultado |
|---|---|
| API REST com a chave pública e sem login, 12 tabelas | `[]` em todas |
| Endpoint de administração do Auth com a chave pública | `403 not_admin` |
| Login com e-mail inexistente × e-mail existente com senha errada | Resposta idêntica (`invalid_credentials`) |
| Recuperação de senha de e-mail inexistente | `200` (igual ao de existente) |
| Cadastro de e-mail já existente e **não confirmado** | Devolve o id da conta (achado de baixa gravidade) |
| `pg_policies`, RLS, privilégios, funções, buckets, extensões, `cron.job` | Lidos pela API de gerenciamento (SQL de leitura) |
| Configuração do Auth, rede, SSL, backups, avisos de segurança do Supabase | Lidos pela API de gerenciamento |
| Atacante simulado (`role authenticated`, `uid` inexistente) lendo, alterando e apagando linhas de uma usuária real | 0 linhas lidas em 12 tabelas; 0 afetadas em 6 comandos; inserir em nome da vítima e escrever em `social_tokens` → `row-level security`. **Tudo revertido (`rollback`)**; depois, a contagem de documentos continuou 8 |
| Controle positivo: a dona vê os próprios documentos (simulando o `uid` dela) | 4 documentos |
| `anon` (sem login) lendo e inserindo em `planner_docs` | 0 linhas; inserir → `row-level security` |
| Gravar `http://169.254.169.254/...` como endereço de push (como usuária comum) | **Aceito** pelo banco (SSRF confirmado), revertido; conferido que não sobrou nenhum |
| Varredura de segredos em **todo o histórico do Git** (padrões de Anthropic, Meta, Supabase, GitHub, AWS, Slack, Vercel, chaves privadas, JWT) | Nada encontrado; o único JWT é o da chave pública (`role: anon`) |
| `npm audit` das 3 dependências do servidor | 2 avisos baixos (`@supabase/auth-js`) |

## O que não foi testado

Veja a seção "O que não consegui verificar" em `SECURITY_AUDIT.md`: sessões após troca de senha, força bruta de login, uso único do link de recuperação (precisam de conta de teste confirmada em homologação); cabeçalhos e certificado ao vivo (o domínio é bloqueado neste ambiente); rotas da função corrigida (sem `deno` aqui); IA com texto malicioso (gasta créditos); SPF/DKIM/DMARC (DNS bloqueado).
