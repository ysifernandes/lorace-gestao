# Configurando o YouTube (OAuth 2.0)

1. Acesse https://console.cloud.google.com e crie um projeto (ex.: `youtube-autopilot`).
2. **APIs e serviços → Biblioteca**: ative **YouTube Data API v3** e **YouTube Analytics API**.
3. **Tela de consentimento OAuth**: tipo *Externo*; preencha nome/e-mail; adicione os escopos:
   - `.../auth/youtube.upload`
   - `.../auth/youtube.readonly`
   - `.../auth/youtube.force-ssl` (envio de legendas)
   - `.../auth/yt-analytics.readonly`
   Enquanto o app estiver em *Teste*, adicione a conta Google dona do canal em **Usuários de teste**.
4. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**.
   - URI de redirecionamento autorizado: `http://localhost:8000/api/oauth/youtube/callback`
     (em produção use `https://SEU_DOMINIO/api/oauth/youtube/callback` e ajuste `PUBLIC_BASE_URL`).
5. Baixe o JSON e salve como `secrets/client_secret.json` (a pasta `secrets/` está no `.gitignore`).
6. No `.env`: `PUBLISHER=youtube`. Reinicie a API.
7. No painel: **Integrações → Autorizar canal do YouTube**. Faça login com a conta do canal e aceite.
   O token (com refresh token) é salvo em `secrets/youtube_token.json` com permissão 600.
8. Clique em **Verificar ao vivo** na linha `publisher`: deve aparecer o nome do canal.

## Cotas e limites
- Cota padrão: 10.000 unidades/dia. `videos.insert` ≈ 1.600 unidades; `search.list` (medição de
  concorrência) = 100 unidades (o sistema mede só os 5 temas mais promissores por dia); `thumbnails.set` = 50;
  `captions.insert` = 400.
- Thumbnails personalizadas exigem canal verificado por telefone; se falhar, o vídeo é enviado assim mesmo e o
  aviso fica registrado em `publish_result.warnings`.
- **Projetos não auditados**: uploads ficam travados como privados. Solicite a auditoria em
  https://support.google.com/youtube/contact/yt_api_form antes de usar privacidade pública.

## Agendamento
Com `Privacidade = Público`, o vídeo é enviado como privado com `publishAt` no próximo horário de postagem
configurado (no fuso do canal), e o YouTube o torna público nesse horário. Com `Privado`/`Não listado`, o vídeo é
enviado imediatamente com essa privacidade.
