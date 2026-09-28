# Helen Regiani Nails — site + painel

Site da Helen Regiani Nails (Nail Design em Coimbra), igual ao original em `C:\Projetos\helen`
— mesmo logo, textos, cores, serviços, WhatsApp, Instagram e e-mail — com estes acréscimos:

- **Onboarding “Cria a tua unha”**: um passo a passo guiado pela Helen (nome → serviço → formato → cor → acabamento → resultado).
  Abre pelo convite que aparece na primeira visita ou pelo botão “Criar a minha unha”. No fim a cliente marca pelo WhatsApp,
  guarda o design ou vai afinar no estúdio.
- **Entrar com o Google** → “As minhas unhas”: a cliente guarda até 5 designs.
- **Vernizes do stock ligados às cores do site**: ao escolher uma cor aparece “🧴 Verniz: marca · nome”, que também segue
  na mensagem do WhatsApp. Numa cor exclusiva, o site sugere o verniz mais parecido.
- **Rastreamento completo** e **painel da Helen** (`admin.html`).

Continua a ser HTML, CSS e JavaScript, sem build. O banco, o login e as estatísticas ficam no [Supabase](https://supabase.com) (o plano gratuito chega).

## Painel (`admin.html`)

Só entram os e-mails registados na tabela `admins`.

- **Visão geral**: visitantes únicos, visitas, marcações enviadas, conversão, tempo médio, registos com Google, onboarding
  concluído, gráfico por dia, origem (Instagram, Google, `?utm_source=`…), dispositivo e secções vistas.
- **Onboarding**: quantas começaram, até que passo chegou cada visita, onde desistiram, como começaram (convite ou botão),
  o que fizeram no fim e que serviço escolheram.
- **Jornada**: o percurso de cada visita no site todo: entrou → estúdio/onboarding → montou uma unha → “Quero esta!” →
  começou a marcação → enviou pelo WhatsApp, e onde pararam.
- **Unhas**: combinações mais escolhidas, formatos, acabamentos e **cores × stock** (procura de cada cor e se o verniz ligado está a acabar).
- **Visitantes**: cada visita com origem, dispositivo, duração, até onde chegou, passo do onboarding e unha escolhida.
  Clicando, mostra a linha do tempo de tudo o que a pessoa fez. Quem volta é reconhecido; quem entrou com o Google aparece com o nome.
- **Stock de vernizes**: marca, nome, código, cor, quantidade, mínimo; botões +/− e alertas de stock baixo.
- **Cores do site**: editar a paleta do estúdio e ligar cada cor a um verniz (com “sugerir o verniz mais parecido”).
- **Clientes**: quem se registou e as unhas que guardou.

## Configuração (uma vez)

1. **Supabase**: criar um projeto em supabase.com.
2. **Banco**: em *SQL Editor*, colar e correr todo o `supabase/schema.sql`.
3. **Administradora**: no SQL Editor, correr
   ```sql
   insert into public.admins (email) values ('helenregiani25@gmail.com');
   ```
4. **Login com o Google**
   - No [Google Cloud Console](https://console.cloud.google.com/apis/credentials): *Criar credenciais → ID do cliente OAuth → Aplicação Web*.
     Em “URIs de redirecionamento autorizados”: `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
   - No Supabase: *Authentication → Providers → Google* → ativar e colar o Client ID e o Client Secret.
   - No Supabase: *Authentication → URL Configuration* → *Site URL* com o endereço do site e, em *Redirect URLs*,
     também `http://localhost:5500/**` para testes.
5. **Chaves**: em *Project Settings → API*, copiar a *Project URL* e a *anon public key* para `CONFIG.supabase` em `js/config.js`.
   (A anon key é pública; a segurança está nas regras RLS do `schema.sql`.)

Sem o passo 5 o site funciona exatamente como o original, com o onboarding (sem login, sem “As minhas unhas” e sem estatísticas).

Contactos, serviços e o atraso do convite do onboarding (`onboardingInviteDelay`) ficam em `js/config.js`.

## Correr localmente

O login do Google não funciona a abrir o ficheiro diretamente (`file://`). Usar um servidor local:

```
npx serve -l 5500 .
```

e abrir `http://localhost:5500`.

## Publicar

Netlify, como o site original: a pasta publicada é a raiz, sem build.

## Rastreamento — como funciona

- Cada navegador recebe um identificador anónimo (`localStorage`) → visitantes únicos e quem voltou.
- Uma visita termina após 30 min sem atividade.
- Os eventos vão para a tabela `events`: qualquer pessoa pode **gravar**, só a administradora pode **ler**.
  A data e a utilizadora são carimbadas pelo servidor.
- O navegador que abre o painel deixa de ser contado nas estatísticas.
- Links com `?utm_source=instagram_bio` (ou `?src=...`) aparecem como origem no painel.
- Robôs de automação são ignorados. Um aviso discreto informa sobre a medição anónima (RGPD).

Eventos: `page_view`, `section_view`, `view_studio`, `design_customize`, `design_random`, `design_choose`, `design_save`,
`design_delete`, `save_prompt`, `login_open`, `login`, `quiz_start`, `quiz_complete`, `gallery_open`, `service_click`,
`faq_open`, `booking_start`, `booking_error`, `booking_submit`, `whatsapp_click`, `onboarding_invite`,
`onboarding_invite_dismiss`, `onboarding_start`, `onboarding_step`, `onboarding_close`, `onboarding_complete`, `onboarding_action`.

## Estrutura

```
index.html           site (o da Helen + login, as minhas unhas, onboarding)
admin.html           painel da Helen
assets/logo.jpeg     logo
css/styles.css       visual do site (o original da Helen + componentes novos)
css/admin.css        visual do painel (claro e escuro)
js/config.js         CONFIGURAÇÃO (edita aqui)
js/nails.js          desenho das unhas (partilhado)
js/track.js          rastreamento
js/backend.js        Supabase: login, paleta, stock, unhas guardadas
js/site.js           interações do site (o script da Helen + novidades + onboarding)
js/admin.js          painel
supabase/schema.sql  tabelas, regras de segurança e a função do painel
```
