# YOUTUBE AI AUTOPILOT

Sistema autônomo de produção de vídeos para YouTube: pesquisa tendências, planeja a pauta, escreve roteiros
originais **com fontes**, gera narração e visuais licenciados, edita com FFmpeg (Shorts 1080×1920 e horizontal
1920×1080), cria thumbnail e SEO e publica via YouTube Data API — com revisão humana, limites de gasto e um
portão de prontidão que **impede publicação real** até OAuth, APIs, auditoria e testes estarem concluídos.

> Stack: Python 3.11+ · FastAPI · SQLite (SQLAlchemy) · APScheduler · FFmpeg · React (Vite) ·
> Claude API · ElevenLabs · Google Trends/News · Pexels · YouTube Data API v3 / Analytics API.

---

## Status real das integrações

Nada aqui é simulado como concluído. O painel mostra o estado de cada adaptador (`Demo`, `Não configurado`,
`Configurado`, `Não implementado`) e só considera uma integração pronta depois de um **health-check ao vivo**.

| Módulo | Adaptador real | Estado nesta entrega |
|---|---|---|
| Roteiro/pautas/SEO | Claude API (`claude-opus-5-5`, saída estruturada JSON Schema, fallback em recusa) | Implementado; testado com mocks. **Não verificado ao vivo** (precisa da sua `ANTHROPIC_API_KEY`). |
| Narração | ElevenLabs (`/with-timestamps`, legendas sincronizadas por palavra) | Implementado e **verificado ao vivo** (voz real + tempos por palavra). |
| Tendências | Google Trends (`pytrends`, não oficial) + Google News RSS + Wikipédia | Implementado. **Não verificado ao vivo** (rede do ambiente de build bloqueou esses hosts). `pytrends` pode receber HTTP 429; há fallback para News. |
| Visuais | Pexels (licença Pexels, atribuição registrada) | Implementado; **não verificado** (precisa de `PEXELS_API_KEY`). |
| Publicação | YouTube Data API v3 com OAuth 2.0 (upload resumível, thumbnail, legendas, agendamento, declaração de mídia sintética) | Implementado; **não verificado** (precisa do seu OAuth). |
| Analytics | YouTube Data API (views/likes/comentários) + YouTube Analytics API (retenção) | Implementado; não verificado. CTR de impressões **não é exposto** pela API pública → exibido como “indisponível”. |
| Vídeo por IA | Ponto de extensão `VideoGenerationAdapter` | **Não implementado.** Hoje os vídeos usam imagens com movimento (Ken Burns). |
| Fluxo demo | LLM determinístico, TTS silencioso, arte abstrata original, publicação dry-run | **Funcional**: gera um MP4 completo com legendas e thumbnail; nunca publicável. |

---

## Instalação (passo a passo)

### 1. Pré-requisitos
- Python 3.11 ou superior
- Node.js 18+ e npm
- FFmpeg com `libass` e `libx264` (`ffmpeg -filters | grep ass`)
  - Ubuntu/Debian: `sudo apt install ffmpeg fonts-dejavu-core`
  - macOS: `brew install ffmpeg` (ajuste `FONT_PATH` no `.env` para uma fonte TTF existente)

### 2. Dependências
```bash
cd youtube-ai-autopilot
make install            # cria .venv, instala backend e frontend
# ou manualmente:
python3 -m venv .venv && .venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install && cd ..
```

### 3. Configuração
```bash
cp .env.example .env
python3 -c "import secrets;print(secrets.token_urlsafe(32))"   # cole em ADMIN_TOKEN
mkdir -p secrets
```
Com os valores padrão tudo roda em **modo demo** (sem custos, sem chamadas externas, nada publicado).

### 4. Execução
```bash
make test               # 22 testes automatizados
make build              # gera o painel (frontend/dist)
make api                # API + worker + painel em http://localhost:8000
```
Desenvolvimento do painel com hot-reload: `make api` em um terminal e `make frontend` em outro
(http://localhost:5173, com proxy para a API).

Entre com o `ADMIN_TOKEN`, clique em **Gerar vídeo demo**, aprove o roteiro em **Vídeos** e assista ao resultado.
Sem servidor: `make demo` gera o vídeo direto pela CLI.

---

## Conectando os serviços reais (um de cada vez)

Siga a ordem abaixo; após cada etapa use **Integrações → Verificar ao vivo** (ou `python -m app.cli check`).

1. **Claude** — crie a chave em console.anthropic.com → `ANTHROPIC_API_KEY=...` e `LLM_PROVIDER=claude`.
2. **ElevenLabs** — chave em elevenlabs.io → `ELEVENLABS_API_KEY`; escolha uma voz (que você tenha direito de
   uso comercial) e copie o ID para `ELEVENLABS_VOICE_ID`; `TTS_PROVIDER=elevenlabs`.
3. **Pexels** — chave em pexels.com/api → `PEXELS_API_KEY`, `VISUALS_PROVIDER=pexels`.
4. **Tendências** — `TRENDS_PROVIDER=google` (não exige chave).
5. **YouTube** — ver [docs/YOUTUBE_OAUTH.md](docs/YOUTUBE_OAUTH.md): projeto no Google Cloud, APIs ativadas,
   tela de consentimento, cliente OAuth *Web* com redirect `http://localhost:8000/api/oauth/youtube/callback`,
   JSON salvo em `secrets/client_secret.json`, `PUBLISHER=youtube`, depois **Autorizar canal** no painel.

Reinicie a API após editar o `.env`.

## Liberando a publicação

A publicação real só acontece quando **todos** os itens do checklist de prontidão (Integrações) estão verdes:
fluxo demo renderizado, health-check ao vivo de cada integração real (válido por 24h), OAuth concluído,
um vídeo real produzido e revisado, testes automatizados aprovados (últimos 7 dias) e auditoria humana assinada.
O **modo automático** exige ainda digitar a frase de autorização explícita. Detalhes em
[docs/OPERACAO.md](docs/OPERACAO.md).

> Política do YouTube: vídeos enviados por projetos de API **não auditados** ficam privados. Para publicar
> publicamente, solicite a auditoria da YouTube API Services.

---

## Regras editoriais aplicadas no código
- Roteiros só podem usar fatos das referências coletadas; cada cena precisa citar a fonte; uma checagem de
  fatos separada reprova afirmações sem suporte.
- Temas sensíveis (saúde, política, tragédias, finanças, crime) e notícias com menos de 2 fontes ou com menos
  de 24h **sempre** exigem aprovação humana, mesmo no modo automático.
- Anti-repetição: impressão digital do tema + similaridade de roteiro (shingles) contra vídeos anteriores.
- Títulos sensacionalistas são filtrados; toda descrição recebe aviso de uso de IA e créditos das imagens;
  `containsSyntheticMedia` é enviado ao YouTube.
- Somente visuais com licença registrada por ativo (arte própria ou Pexels).
- Orçamento por vídeo e mensal verificados **antes** de cada chamada paga.

## Estrutura
```
youtube-ai-autopilot/
├── backend/
│   ├── app/
│   │   ├── adapters/     # contratos + implementações demo e reais (Claude, ElevenLabs, Pexels, Trends, YouTube)
│   │   ├── services/     # pesquisa, planejador, segurança, editor FFmpeg, thumbnail, analytics, orçamento, prontidão
│   │   ├── api/routes.py # API REST do painel
│   │   ├── pipeline.py   # orquestração das etapas e portões humanos
│   │   ├── worker.py     # fila SQLite, retries com backoff, scheduler diário
│   │   ├── models.py     # tabelas SQLite
│   │   └── cli.py
│   └── tests/
├── frontend/             # painel React (Vite)
├── docs/
└── .env.example
```
Arquitetura e fluxo de estados: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
