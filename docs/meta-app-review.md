# Bloom Planner: material para o pedido de revisão da Meta

Este arquivo tem tudo o que será colado ou gravado no painel da Meta (developers.facebook.com → Bloom Planner → Revisão do app). Os textos para a Meta estão em **inglês**, porque é o que os revisores leem. As instruções para você estão em português.

> Conferir no painel antes de enviar: nomes de campos e regras da Meta mudam. Onde o texto abaixo depender de algo que ainda precisa ser feito, está marcado com **[FAZER]**.

---

## 1. Resumo do app (campo "App description" / "Detailed description")

**Bloom Planner** is a planner for small-business owners in Brazil. It helps them plan content, track tasks and goals, and understand how their Instagram posts perform. Through Facebook Login, the user connects her own Instagram professional account. Bloom then shows, inside her private dashboard, her account name, followers and her recent posts with performance numbers (reach, views, likes, comments, saves, shares), a score for each post compared with her own average, and which formats, days and times work best for her.

Bloom does **not** publish content, send messages, comment, follow, run ads or share data with other users. Each user only sees her own data.

- Website / app: https://bloom-planner-yasmin17.vercel.app
- Privacy policy: https://bloom-planner-yasmin17.vercel.app/privacidade.html (contact: usebloomplanner@gmail.com)
- Terms of service: https://bloom-planner-yasmin17.vercel.app/termos.html
- Data deletion instructions: https://bloom-planner-yasmin17.vercel.app/exclusao-de-dados.html
- Data deletion callback / deauthorize callback: `https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social/data-deletion` (it verifies the signed request and deletes the user's Instagram data)
- Business: CNPJ 60.373.389/0001-42 (Loracê)

---

## 2. Permissões: o que o Bloom usa de verdade

O código lê apenas estes campos. **Peça só as permissões da tabela.** A Meta reprova pedidos de permissões que o app não usa.

| Permissão | Para que o Bloom usa | Onde aparece no app |
|---|---|---|
| `instagram_basic` | Nome de usuário, foto de perfil, número de seguidores e a lista de posts recentes (legenda, link, data, curtidas e comentários) | Insights → cartão do Instagram e lista de posts |
| `instagram_manage_insights` | Números de cada post: alcance, visualizações, salvamentos, compartilhamentos, interações e seguidores ganhos | Insights → detalhe de cada post, nota do post, gráficos |
| `pages_show_list` | Listar as páginas do Facebook da usuária para achar a conta profissional do Instagram ligada a elas | Tela de conexão e "trocar conta" |
| `pages_read_engagement` | Ler, a partir da página, a conta do Instagram ligada a ela (a Meta exige para acessar a conta pela página) | Mesma conexão |
| `business_management` | **Não pedir por enquanto.** Só é necessária se as páginas pertencerem a um portfólio empresarial e a lista de páginas vier vazia sem ela. **[FAZER]** testar a conexão sem ela; se funcionar, remover do pedido e da configuração "Bloom Instagram" |

Remover do app as permissões antigas que ficaram da primeira tentativa: `instagram_business_basic` e `instagram_business_manage_insights`.

### Textos de justificativa (copiar e colar, um por permissão)

**instagram_basic**
> Bloom uses instagram_basic to read the connected Instagram professional account's username, profile picture, follower count and recent media list (caption, permalink, timestamp, like and comment counts). The data is shown only to the account owner in her private dashboard ("Insights" tab) so she can see her posts and results in one place. Without this permission the dashboard cannot show the user's account or posts.

**instagram_manage_insights**
> Bloom uses instagram_manage_insights to read per-post insights (reach, views, saves, shares, total interactions and follows) for the user's own media. We use these numbers to calculate a performance score for each post relative to the user's own average and to show which formats, days of the week and times of day perform best for her. Without this permission the app cannot show how each post performed. We never use these metrics for advertising and never share them with other users.

**pages_show_list**
> Bloom uses pages_show_list to list the Facebook Pages the user manages, because the Instagram professional account is linked to a Page. We use the list only to find the linked Instagram account and, if the user has more than one, let her choose which account to connect. We do not display or store the Page list for any other purpose.

**pages_read_engagement**
> Bloom uses pages_read_engagement to read the Instagram professional account that is linked to the user's Page (the Page's instagram_business_account field and the Page access token needed to call the Instagram API). We do not read Page posts, comments or fans.

*(Se a Meta pedir a `business_management`:)*
> Bloom uses business_management only so that Pages owned by the user's Business Portfolio appear in the Page list, which is needed to find the connected Instagram account. We do not read or change any other Business data.

### Dados e terceiros (campos de "Data handling")
- **O que guardamos:** token de acesso, nome de usuário, foto, seguidores, posts e métricas, ligados à conta da usuária.
- **Onde:** Supabase (banco de dados, região us-east-1, EUA) e Vercel (hospedagem do site). Acesso protegido por login, e cada usuária só lê os próprios dados.
- **Terceiro que recebe dados:** a **Anthropic (Claude)** recebe, **somente quando a usuária toca em "analisar"**, uma lista dos posts dela com: título (a primeira linha da legenda), rede, formato, pasta, data e hora, gancho, nota, anotações dela e os números (visualizações, alcance, curtidas, comentários, salvamentos, compartilhamentos, seguidores ganhos). **Não são enviados** o nome de usuário, a foto, o token nem o ID da conta. No assistente de conteúdo, só vai o que a própria usuária escreve ou fala.
- **Não vendemos, não compartilhamos para publicidade e não usamos os dados para outros fins.**
- **Exclusão:** pelo botão "desconectar" (apaga a conexão, o token e os dados importados), por "Excluir minha conta" nos Ajustes, ou removendo o app pelo Facebook (o endereço de exclusão apaga tudo e mostra o status do pedido).

---

## 3. Roteiros dos vídeos de demonstração

Grave **um vídeo por permissão** (ou um só, mostrando tudo, se a Meta aceitar). Regras gerais:
- Grave a tela do **computador** (mais legível) em 1080p, sem cortes no meio do fluxo, com a tela do Facebook visível por inteiro.
- Use uma **conta de teste** do Instagram (profissional, ligada a uma página). Não grave a sua conta pessoal.
- Coloque **legendas em inglês** descrevendo o que acontece. Não precisa de voz.
- Duração: de 2 a 4 minutos.

### Vídeo único (sugestão), em ordem
| # | O que mostrar | Legenda sugerida (inglês) |
|---|---|---|
| 1 | Abrir https://bloom-planner-yasmin17.vercel.app e entrar com e-mail e senha | "The user signs in to Bloom with her email and password." |
| 2 | Ir em **Insights** e mostrar o cartão do Instagram com o botão **Conectar** | "In Insights, the user taps Connect to link her Instagram." |
| 3 | Tocar em **Conectar**: aparece a tela do Facebook com as permissões. **Pare 3 segundos nela** | "Facebook Login asks for the permissions listed here. The user chooses her Page and Instagram account." |
| 4 | Voltar ao Bloom, mostrar o aviso "Instagram conectado" | "Connected. Bloom reads the account and recent posts." |
| 5 | Mostrar o cartão com **nome de usuário, seguidores** | "instagram_basic: account name and follower count." |
| 6 | Mostrar a **lista de posts** com data e miniatura/título | "instagram_basic: recent media (caption, date, link, likes, comments)." |
| 7 | Abrir um post: **alcance, visualizações, salvamentos, compartilhamentos** e a nota | "instagram_manage_insights: per-post insights and a performance score." |
| 8 | Mostrar o gráfico "o que funciona melhor" (por formato, dia, horário) | "Insights are used only to show the user which formats and times work for her." |
| 9 | Tocar em **trocar conta** e mostrar a lista das contas (se houver mais de uma) | "pages_show_list: the user picks which linked account to use." |
| 10 | Tocar em **desconectar** e confirmar | "The user can disconnect at any time; the token and imported data are deleted." |
| 11 | **Ajustes → Excluir minha conta** (só mostrar a janela de confirmação, sem confirmar) e abrir a página **Exclusão de dados** | "The user can delete her account and data at any time." |

O botão "desconectar" apaga a conexão, o token e os dados importados do nosso banco e pergunta se os posts já copiados para o planner da usuária também saem (o padrão é remover). Mostre essa janela no passo 10 do vídeo.

---

## 4. Notas para os revisores (campo "Notes for reviewer")

> **How to test Bloom**
> 1. Open https://bloom-planner-yasmin17.vercel.app and sign in with the test account below.
>    - Email: **[FAZER: e-mail da conta de teste]**
>    - Password: **[FAZER: senha da conta de teste]**
> 2. Go to **Insights** and tap **Conectar** (Connect) on the Instagram card.
> 3. In the Facebook dialog, sign in with the test Facebook user below, select the Page and the Instagram account, and approve all permissions.
>    - Facebook test user: **[FAZER]**
>    - The linked Instagram professional account: **[FAZER]**
> 4. Back in Bloom, the Instagram card shows the account and the post list; tap a post to see its insights.
> 5. To test data deletion: tap **desconectar** on the Instagram card, or remove the app from the Facebook test user's Business Integrations; the deletion callback erases the data and the status page shows the request.
>
> Bloom does not publish content, send messages or access any data beyond what is described in the permission justifications.

**[FAZER] Acesso dos revisores.** Para os revisores entrarem no Bloom, é preciso uma conta de teste já confirmada (o e-mail de confirmação de cadastro ainda não funciona para outras pessoas, por causa do envio de e-mail). Duas formas:
1. Configurar um servidor de e-mail (SMTP) com o Gmail da Bloom, e aí o cadastro funciona para qualquer pessoa. É o que vamos precisar de qualquer jeito para os clientes.
2. Criar a conta de teste direto pelo painel do Supabase (Authentication → Users → Add user, marcando "Auto confirm"). Isso é feito por você, no painel.

**[FAZER] Contas de teste do Instagram e do Facebook.** Crie um usuário de teste na Meta (App roles → Test users) e uma conta de Instagram profissional de teste ligada a uma página, ou use uma segunda conta sua. Os revisores precisam de acesso a elas.

---

## 5. Checklist do painel antes de enviar

- [ ] Verificação da empresa concluída (nome do portfólio igual ao do certificado do CNPJ).
- [ ] Cadastro como **Provedor de Tecnologia** concluído.
- [ ] Ícone do app (1024×1024), categoria, e-mail de contato e as três URLs (privacidade, termos, exclusão) preenchidos. Já estão.
- [x] Política de privacidade atualizada (login pelo Facebook, Anthropic, contato usebloomplanner@gmail.com, empresa e CNPJ).
- [ ] Callback de exclusão e de remoção do app apontando para `.../social/data-deletion`. Já está.
- [ ] Só as permissões da tabela da seção 2 no pedido.
- [ ] Vídeo(s) enviado(s) e textos colados.
- [ ] Notas para os revisores com as contas de teste.
- [ ] Depois da aprovação: mudar o app para **Ao vivo**.

---

## 6. Perguntas que a Meta costuma fazer, com a resposta pronta

- **"Why do you need Page permissions for an Instagram app?"**: because the Instagram professional account is accessed through its linked Facebook Page; we use the Page only to find that account.
- **"Do you share data with third parties?"**: only when the user taps "analyze", a list of her own posts (the first line of each caption used as a title, format, date and the performance numbers, plus her own notes) is processed by Anthropic (Claude) to generate suggestions. Usernames, profile photos, account IDs and access tokens are never sent. We do not sell data or use it for ads.
- **"Do you use data to train AI?"**: no. (Confirmar com a política de dados da Anthropic para a API antes de enviar.)
- **"How long do you keep data?"**: until the user disconnects, deletes her account or removes the app from Facebook; deletion is immediate.
- **"Can users delete their data?"**: yes, three ways (disconnect, delete account, Facebook removal), with a public status page.
