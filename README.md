# Focus — App de Gestão de Treinos de Academia (MVP)

MVP de gestão de treinos de academia com três perfis — **Aluno**, **Instrutor** e **Dono**. Roda em **celular** (via Expo Go) e em **web/PC** (via navegador), compartilhando os mesmos dados através de um **servidor local** na rede (LAN). Sem nuvem; banco em **SQLite** (arquivo único).

Monorepo com dois pacotes independentes:

- `server/` — backend Node.js/Express + SQLite (API REST).
- `app/` — cliente Expo (React Native + Expo Router), roda em web e mobile a partir do mesmo código.

Toda a interface é em **Português do Brasil**.

---

## Pré-requisito

Node.js **LTS 20.x ou 22.x** (o repositório traz `.nvmrc` com `22`; use `nvm use` para selecionar). Essa faixa, combinada com `better-sqlite3` pinado em `^12.2.0`, garante o download do binário pré-compilado (prebuild) e evita a necessidade de ferramentas de build (Visual Studio Build Tools / `node-gyp`).

> O ambiente de desenvolvimento pode ter uma versão mais nova do Node; o **alvo de execução** é a LTS 20/22. Se precisar, instale a LTS indicada antes de rodar.

---

## Como rodar

### 1. Servidor (API)

```
cd server
npm install
npm run start
```

- Cria e semeia `server/data/focus.db` automaticamente no primeiro boot.
- Passa a escutar em `http://localhost:3000`.
- O seed é idempotente: rodar de novo não duplica os dados.

### 2. App na web (PC)

Em outro terminal:

```
cd app
npm install
npx expo start --web
```

Abre a tela de login no navegador. Com o servidor rodando, você já pode entrar.

### 3. App no celular (Expo Go)

O celular precisa alcançar o PC pela LAN. Descubra o **IP da LAN do PC** (ex.: `192.168.0.10`) e aponte o app para ele via a variável de ambiente `EXPO_PUBLIC_API_BASE_URL` antes de iniciar o Expo:

PowerShell (Windows):

```
cd app
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.0.10:3000"
npx expo start
```

bash/zsh (macOS/Linux):

```
cd app
EXPO_PUBLIC_API_BASE_URL="http://192.168.0.10:3000" npx expo start
```

Depois, abra o app no **Expo Go** lendo o QR Code. O celular e a web conversam com o **mesmo** backend e veem os mesmos dados.

> A URL base da API tem default `http://localhost:3000` (bom para a web no mesmo PC). Para o celular, é obrigatório apontar para o IP da LAN, pois `localhost` no celular se refere ao próprio aparelho.

---

## Credenciais semeadas (somente demonstração)

| Perfil | Credencial (login/matrícula) | Senha | Observação |
|---|---|---|---|
| Dono | `dono` | `dono123` | Já aprovado. |
| Instrutor | `instrutor` | `instrutor123` | Troca de senha obrigatória no 1º acesso. |
| Aluno (aprovado) | `2024001` | `aluno123` | Já tem uma ficha ativa de exemplo. |
| Aluno (pendente) | `2024002` | — | Serve para demonstrar a aprovação pelo dono. |

- Aluno entra pela **matrícula**; instrutor e dono entram pelo **login**.

> **Aviso de segurança (somente demo):** o `JWT_SECRET` default e estas senhas de seed existem **apenas para demonstração** em LAN de testes. Troque-os antes de qualquer uso fora do ambiente de demonstração.

---

## Walkthrough dos fluxos de conta

**Solicitação e aprovação de aluno**

1. Na tela de login, toque em **"Solicitar conta de aluno"**.
2. Informe matrícula, nome e senha e envie. A conta nasce **pendente**.
3. Entre como **dono** (`dono` / `dono123`), vá em **Solicitações** e toque em **Aprovar**.
4. O aluno agora consegue entrar com a matrícula e a senha escolhidas.

**Cadastro de instrutor e troca de senha obrigatória**

1. Como **dono**, vá em **Instrutores** e preencha **Cadastrar instrutor** (nome, login, senha padrão).
2. Entre como esse instrutor usando o login e a senha padrão.
3. No primeiro acesso, o app exige **Trocar senha**. Após salvar, o instrutor é direcionado às suas telas normalmente (sem relogar).

**Montagem e execução de treino**

1. Como **instrutor**, abra **Alunos**, toque em um aluno aprovado e monte/edite a **Ficha de treino** (título + exercícios). Salvar preserva o progresso dos exercícios mantidos.
2. Como **aluno** (`2024001` / `aluno123`), abra **Meu treino**, marque as séries concluídas e acompanhe o **Progresso**.

---

## Gerar o APK (EAS Build)

É possível empacotar o app em um **APK** instalável no Android usando o **EAS Build** (serviço de build na nuvem da Expo). O `eas-cli` já é uma **devDependency** do pacote `app/`, então não precisa instalar nada globalmente — basta usar `npx eas`.

Pré-requisitos:

- Uma **conta Expo gratuita** (crie em [expo.dev](https://expo.dev)).
- Dependências do app instaladas.

Passos (PowerShell/Windows):

```
cd app
npm install
npx eas login
npx eas build -p android --profile preview
```

- O perfil **`preview`** (definido em `app/eas.json`) gera um **`.apk`** de distribuição interna, pronto para instalar direto no celular.
- Como atalho, há o script `npm run build:apk` (equivale ao comando `eas build` acima).
- Ao terminar, o EAS retorna um **link** para baixar o `.apk`. Baixe no celular e instale (pode ser preciso permitir "instalar de fontes desconhecidas").

## Endereço do servidor no app instalado

Um **único APK serve para qualquer rede**, porque o endereço do servidor é configurável **em tempo de execução** (não fica congelado no build). Após instalar o APK:

1. Abra o app e, na tela de login, toque em **"Endereço do servidor"**.
2. Digite a URL da **LAN do PC** onde o backend roda (ex.: `http://192.168.0.10:3000`).
3. Toque em **"Testar conexão"** para confirmar que o servidor responde.
4. Toque em **"Salvar"** e volte ao login para entrar normalmente.

> Celular e PC precisam estar na **mesma rede Wi-Fi**, e o **backend precisa estar rodando** (`cd server; npm run start`). O endereço salvo fica guardado no aparelho e é usado em todas as chamadas seguintes.

---

## Hospedar o servidor no Render (gratuito)

Para apresentar a demo ao cliente sem depender da sua LAN (e sem manter seu PC ligado), o backend `server/` pode rodar no **Render.com** no **plano gratuito**. Assim o app/APK fala com uma **URL pública https** em vez de um IP da rede local.

Passos:

1. **Envie o repositório para o GitHub** (o Render puxa o código de lá).
2. No Render, escolha uma das opções:
   - **Blueprint (recomendado):** *New → Blueprint* apontando para o repo. O Render lê o `render.yaml` na raiz e cria o Web Service `focus-server` já configurado.
   - **Web Service manual:** *New → Web Service*, aponte o **Root Directory** para `server`, use **build** `npm install` e **start** `npm start`, plano **Free**.
3. Aguarde o primeiro deploy. O Render gera uma **URL pública https** (ex.: `https://focus-server.onrender.com`) — **sem `:3000`**, pois o Render serve em 443/https.
4. O **`JWT_SECRET` é gerado automaticamente** pelo Render (`generateValue`), sem precisar colar segredo nenhum.
5. O **health check** usa `/health` (responde `{"ok":true}`).

> **Avisos do plano gratuito:**
> - **Hibernação + cold start:** o serviço **dorme após ~15 min** sem uso; a primeira requisição depois disso leva **~1 min** para "acordar". É normal na demo — basta esperar o primeiro acesso.
> - **Dados efêmeros:** o SQLite fica em disco **efêmero**, então **os dados resetam** a cada restart/redeploy. O seed recria dono/instrutor/aluno a cada boot. Ok para demo; produção exigiria um banco persistente (ex.: Postgres) — tarefa futura.

No **APK ou app web**, na tela **"Endereço do servidor"**, informe a **URL https do Render** (ex.: `https://focus-server.onrender.com`, **sem `:3000`**), toque em **"Testar conexão"** e salve.

---

## Publicar a versão web na Vercel

Além de rodar a web localmente (`npx expo start --web`), dá para publicar a **versão web** do app numa **URL pública https** usando a **Vercel**, com **auto-deploy** a cada push. Fluxo natural: backend no Render (acima) → front web na Vercel.

Passos:

1. **Conecte o repositório do GitHub** (`ruanfdpontes/focusapp`, branch `main`) à Vercel (*Add New → Project → Import*).
2. Defina o **Root Directory = `app`** (é um monorepo; a web vive no pacote `app/`).
3. Build e roteamento já vêm do `app/vercel.json` — não precisa configurar à mão:
   - **Build:** `npx expo export --platform web` gera a saída estática em `dist`.
   - **Rewrites de SPA:** todo caminho cai no `index.html`, então refresh/deep-link em rotas profundas (`/login`, `/servidor`, `/trocar-senha`, `/solicitar-conta` e rotas por perfil) **não dá 404** num host estático.
4. A Vercel gera uma **URL pública https** e faz **auto-deploy** a cada push no `main`.

Sobre a API:

- A web **já fala com o backend do Render por padrão** (default `https://focusapp-tawg.onrender.com`, definido em `app/app.config.js`) — não é preciso configurar nada.
- Opcionalmente, para apontar para outro backend, defina a env **`EXPO_PUBLIC_API_BASE_URL`** nas *Environment Variables* da Vercel (requer um novo build/redeploy), ou use a tela **"Endereço do servidor"** dentro do app (override em runtime).

---

## Estrutura

```
focus/
├─ server/   # API Node.js/Express + SQLite
└─ app/      # Cliente Expo (web + mobile)
```

- Formato único de erro da API: `{ "erro": { "codigo", "mensagem" } }`. O cliente traduz o `codigo` para mensagens em pt-BR.
- Estados de conta (`pendente`/`aprovado`/`rejeitado`) e a flag de troca de senha são sempre validados no servidor, lendo o registro do banco.

---

## Contingência de instalação (better-sqlite3)

`better-sqlite3@^12.2.0` é um módulo nativo instalado via prebuild. Na faixa de Node alvo (20/22), o `npm install` baixa o binário pronto para `win32-x64` sem compilar.

Se, na máquina alvo, o prebuild estiver ausente e o `npm install` tentar compilar (acionando `node-gyp`), as opções são:

1. Instalar exatamente a **Node LTS 20 ou 22** indicada no `.nvmrc` e repetir o `npm install`.
2. Em último caso, usar o plano B `node:sqlite` (SQLite nativo do Node) — **requer Node 22+** e é uma API experimental. Documentado aqui como alternativa; o produto da demo usa `better-sqlite3`.

---

## Próximos passos

- **Trava de recinto (geofencing/LAN):** já existe a costura (`server/src/middleware/recintoLock.js`) como middleware no-op nas rotas protegidas. Uma versão futura pode validar o IP de origem contra a sub-rede da academia, um header de dispositivo autorizado ou geofencing — sem alterar rotas. **Não implementado neste MVP.**
- Reabertura/reenvio de solicitação para matrícula rejeitada.
- Histórico de fichas inativas.
- HTTPS/TLS e deploy fora da LAN (exigiria trocar segredos e senhas de seed).
