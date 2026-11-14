# Bloom: servidor (Supabase) e site (Vercel)

- `schema.sql`: tabelas e regras de acesso (cada usuária só vê os próprios dados).
- `functions/social/index.ts`: conexão com Instagram e TikTok, busca dos números (diária às 06:00 de Brasília e sob demanda), desconectar e excluir conta.
- Site: `app/` (gerado por `scripts/build_app.py` a partir de `planner.html`) e publicado por `scripts/deploy_vercel.py`.

## Segredos da função (Supabase → Edge Functions → Secrets)
| Nome | O que é |
|---|---|
| `META_APP_ID` / `META_APP_SECRET` / `META_CONFIG_ID` | App da Meta (apps novos): Instagram pelo Login do Facebook para Empresas. A conta profissional do Instagram precisa estar ligada a uma página do Facebook |
| `IG_APP_ID` / `IG_APP_SECRET` | Só para apps antigos com "API com login do Instagram" (usado se os segredos META_* não existirem) |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | App do TikTok for Developers |
| `APP_URL` | Endereço do site (já configurado) |
| `CRON_SECRET` | Usado pela atualização diária (já configurado) |

## Endereços de retorno (redirect URIs)
- Instagram (também em Login do Facebook para Empresas → Configurações → URIs de redirecionamento OAuth válidos): `https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social/callback/instagram`
- TikTok: `https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social/callback/tiktok`
- Exclusão de dados (Meta): `https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social/data-deletion`
