# Focus — App de Gestão de Treinos de Academia (MVP)

Documento combinado de **Requisitos** e **Design Técnico**. Artefato de demonstração para apresentar a um cliente. O produto final (UI, labels, mensagens) é em **Português do Brasil**; este documento de engenharia é escrito em português com termos técnicos em inglês quando convém.

> **Revisão aplicada:** este documento é a **revisão 3**, reescrita a partir do `design-review.json` / `design-review.md` mais recente (veredito `CHANGES_REQUESTED`: 2 HIGH, 3 MEDIUM, 4 NIT). Todos os 9 findings dessa revisão foram endereçados; as respostas por finding estão na **Parte 3 — Respostas à revisão**, no fim do documento. (As respostas à revisão anterior de 13 findings seguem consolidadas no texto.)

---

# Parte 1 — Requisitos

## 1.1 Resumo

Construir, do zero, um MVP de gestão de treinos de academia que roda em **celular** (via Expo Go) e em **web/PC** (via `expo start --web`), compartilhando os mesmos dados. Não há serviços em nuvem: um **servidor local Node.js** roda em um PC e os dispositivos se conectam pela **rede local (LAN)**. O banco é **SQLite** (arquivo único, sem configuração externa).

Três perfis de usuário — **Aluno**, **Instrutor** e **Dono** — com fluxos de conta reais (solicitação→aprovação do aluno; troca de senha obrigatória no primeiro acesso do instrutor). O objetivo da demo é exatamente esses fluxos de conta funcionando contra o backend, mais a visualização/execução de fichas de treino.

**NÃO** há trava de localização/geofencing ("recinto") neste MVP. A arquitetura deve manter uma **costura limpa (seam)** para adicionar essa trava depois, sem retrabalho. **NÃO implementar agora.**

## 1.2 Stack tecnológica (DECIDIDA — não substituir)

- **Cliente (mobile + web):** Expo / React Native, código único rodando no celular via Expo Go e no navegador/PC via Expo web. Expo Router pode ser usado.
- **Backend:** servidor REST local em Node.js (Express).
- **Banco de dados:** SQLite (arquivo único).
- **Idioma de toda a UI:** Português do Brasil.

Decisões de bibliotecas (travadas na seção de design, **com versões pinadas** — ver §2.3): Express + `better-sqlite3@^12.2.0`, `bcryptjs` para hash, `jsonwebtoken` para tokens, Expo Router + React Query no cliente. **Versão de Node alvo travada: Node.js LTS 20.x ou 22.x** — faixa suportada pela linha `better-sqlite3@12.x` pinada (ver §2.3).

## 1.3 Requisitos Funcionais

### Papéis e autenticação
- **RF-01** O sistema tem exatamente três papéis: `aluno`, `instrutor`, `dono`.
- **RF-02** Login real com contas persistidas. Login recebe credencial e retorna um token mais os dados do usuário.
- **RF-03** Senhas são sempre armazenadas com **hash** (bcrypt). Nunca em texto puro.
- **RF-04** Requisições autenticadas enviam o token no header `Authorization: Bearer <token>`.

### Aluno
- **RF-05** O aluno **cria sua própria solicitação de conta** informando **matrícula**, **nome** e uma **senha** escolhida. A solicitação nasce `pendente`.
- **RF-06** O aluno **não consegue logar** enquanto a conta estiver `pendente` ou `rejeitada`. Só loga quando `aprovada`.
- **RF-07** O aluno vê sua **ficha de treino** atribuída, com exercícios (nome, séries, repetições, carga, observações).
- **RF-08** O aluno **marca séries/exercícios como concluídos** e acompanha seu progresso.

### Instrutor
- **RF-09** O instrutor é **criado pelo Dono**, que define uma **senha padrão**.
- **RF-10** No **primeiro login**, o instrutor é **forçado a trocar a senha** antes de usar o app (flag `mustChangePassword`).
- **RF-11** O instrutor vê a **lista de alunos** (aprovados) e **cria/edita a ficha de treino** de cada aluno.
- **RF-12** Uma ficha contém exercícios com: nome, séries, repetições, carga e observações (opcional).

### Dono
- **RF-13** O Dono **aprova ou rejeita** solicitações de conta de alunos pendentes.
- **RF-14** O Dono **cadastra instrutores** definindo a senha padrão de cada um.
- **RF-15** O Dono vê uma **visão geral** da lista de alunos e de instrutores.
- **RF-16** Existe **exatamente um Dono** semeado no startup, com credenciais documentadas no README, para a demo ser imediatamente utilizável.

### Dados e seed
- **RF-17** O backend, no primeiro run, **cria e semeia** o SQLite automaticamente: pelo menos o Dono, mais dados de exemplo (um instrutor, um aluno aprovado, uma ficha com alguns exercícios) para a demo não começar vazia.
- **RF-18** A **URL base da API no cliente é configurável** (constante/env), com default `localhost` em dev, para apontar ao IP da LAN do PC.

## 1.4 Requisitos Não-Funcionais

- **RNF-01** Rodar 100% offline em LAN; nenhuma dependência de serviço em nuvem.
- **RNF-02** Setup de banco zero-config: SQLite em arquivo, criado e migrado por código na inicialização. O `npm install` do servidor deve funcionar com um comando; a dependência nativa (`better-sqlite3`) é satisfeita por prebuild na versão de Node alvo (§2.3).
- **RNF-03** Simplicidade de demo acima de robustez de produção; mas os fluxos de conta devem ser **reais** (persistidos, com estados).
- **RNF-04** Cada deliverable inicia por **um comando documentado** (servidor e app), na versão de Node alvo.
- **RNF-05** Costura para a futura trava de "recinto" deve existir (middleware no-op), sem implementação ativa.
- **RNF-06** Toda a UI em Português do Brasil.

## 1.5 Critérios de Aceitação (testáveis)

1. Com a **versão de Node alvo (LTS 20.x/22.x)** e `better-sqlite3` pinado em `^12.2.0`, rodar o comando de start do servidor em uma máquina limpa instala as dependências via prebuild (sem acionar `node-gyp`/Build Tools), cria o arquivo `focus.db` e semeia 1 Dono + dados de exemplo; o servidor passa a responder em `http://localhost:3000`. `server/package.json` pina as versões de runtime (não usa ranges abertos).
2. `POST /auth/login` com as credenciais do Dono semeado retorna `200` com `token` e `user.role === "dono"`.
3. `POST /accounts/requests` com matrícula+nome+senha cria uma conta de aluno com `status="pendente"` e retorna `201`. **Verificação de persistência (finding 2):** imediatamente após o POST, `SELECT status` da linha criada retorna `'pendente'` (não `'aprovado'`) — o repositório seta a coluna explicitamente, de modo que o teste falha se alguém alterar o default do schema.
4. `POST /auth/login` com um aluno `pendente` retorna `403` com código `CONTA_PENDENTE` e **não** retorna token.
5. Dono chama `POST /accounts/requests/:id/approve` sobre uma conta `pendente` → o aluno passa a `aprovado` e consegue logar (`200`). Chamar `approve`/`reject` sobre conta **não-pendente** retorna `409 ESTADO_INVALIDO`.
6. Dono chama `POST /accounts/requests/:id/reject` sobre conta `pendente` → o aluno fica `rejeitado` e o login retorna `403` com código `CONTA_REJEITADA`.
7. Dono chama `POST /instrutores` com nome + senha padrão → cria instrutor com `mustChangePassword=1`.
8. Primeiro login do instrutor retorna `200` com `user.mustChangePassword === true`; qualquer rota protegida (exceto troca de senha, logout e `GET /auth/me`) retorna `409 SENHA_DEVE_SER_TROCADA` até a troca. O enforcement lê o **registro recarregado do banco**, não o claim do token.
9. `POST /auth/change-password` do instrutor zera a flag **e retorna um token novo** com `mustChangePassword:false`; depois ele acessa as rotas normalmente sem relogar.
10. `GET /auth/me` funciona mesmo quando `mustChangePassword=1`, permitindo ao app reidratar a sessão e rotear para `/trocar-senha` após restart.
11. Instrutor cria ficha via `POST /alunos/:id/fichas` com exercícios; criar/ativar uma ficha **desativa** as demais fichas do mesmo aluno (no máximo uma `ativa=1`). `GET` da ficha pelo aluno dono retorna os mesmos exercícios.
12. Aluno marca uma série via `POST /completions` e `GET /alunos/:id/fichas/:fichaId/progresso` reflete a conclusão. `DELETE /completions` é idempotente (`200` mesmo se nada foi apagado).
13. Editar os exercícios de uma ficha via `PUT /fichas/:fichaId/exercicios` **preserva** as `completions` dos exercícios mantidos (reconciliação por `id`) e remove apenas as dos exercícios excluídos.
14. Trocar `API_BASE_URL` para o IP da LAN faz o app web e o Expo Go conversarem com o mesmo backend e verem os mesmos dados.
15. Toda tela e mensagem exibida ao usuário está em Português do Brasil.
16. Nenhuma trava de localização existe; porém há um middleware `recintoLock` no-op documentado como ponto de extensão.
17. Um aluno autenticado que pede `GET /alunos/<outro_id>/fichas` ou `.../progresso` recebe `404 NAO_ENCONTRADO` (não revela existência de dados de terceiros).
18. `GET /alunos` chamado por um instrutor retorna **apenas** alunos `status='aprovado'`, mesmo que a requisição envie `?status=pendente` (query ignorada para instrutor — finding 3). O dono, por sua vez, consegue listar `pendente`/`rejeitado` via `?status`.
19. `POST /alunos/:id/fichas` para um aluno com `status<>'aprovado'` retorna `409 ALUNO_NAO_APROVADO`; para um `:id` que não é `role='aluno'` (ou inexistente) retorna `404 ALUNO_NAO_ENCONTRADO` (findings 3 e 4).
20. `GET /alunos/<id_de_instrutor>/fichas` (chamado por dono ou instrutor) retorna `404 NAO_ENCONTRADO`, não lista vazia (finding 4).
21. A derivação de `percentual` é determinística: para a ficha de seed (2 de 11 séries concluídas) `percentual === 18` (finding 9).

## 1.6 Fora de Escopo (MVP)

- Trava de localização/geofencing ("recinto") — apenas costura, sem implementação.
- Deploy em nuvem, HTTPS/TLS, domínio.
- Refresh tokens, recuperação de senha por e-mail, 2FA.
- Notificações push, relatórios avançados, gráficos de evolução históricos.
- Edição de perfil pelo aluno, upload de fotos, chat.
- Testes de carga, i18n multi-idioma.
- **Reabertura de conta rejeitada / reenvio de solicitação:** uma matrícula cuja conta foi `rejeitada` permanece bloqueada no MVP (a matrícula fica ocupada). O desbloqueio/reenvio é um próximo passo, não implementado agora (ver finding A8).
- **Histórico de fichas:** cada aluno tem no máximo uma ficha `ativa`; fichas antigas são apenas desativadas, sem telas de histórico.

## 1.7 Suposições

- Um único PC atua como servidor; devices estão na mesma Wi-Fi/LAN.
- "Matrícula" é um identificador textual único do aluno; não há integração com sistema externo de matrículas.
- Um aluno tem no máximo **uma ficha `ativa` por vez**; essa invariante é **enforçada na rota** (§2.5/§2.7). O histórico de fichas inativas fica fora de escopo de UI.
- Datas/horários usam o relógio do servidor.

---

# Parte 2 — Design Técnico

## 2.1 Visão geral

O sistema é um monorepo com dois pacotes independentes: um backend Node.js/Express servindo uma API REST sobre SQLite, e um app Expo (React Native + Expo Router) que roda em web e mobile a partir do mesmo código. O cliente guarda o token em `expo-secure-store` (nativo) / `localStorage` (web) via um wrapper, e todas as chamadas vão para `API_BASE_URL`, uma constante configurável. O backend inicializa o schema e semeia dados idempotentemente no boot, de modo que `npm run start` em máquina limpa já deixa a demo pronta. Autorização é por token JWT assinado localmente; os estados de conta (`pendente`/`aprovado`/`rejeitado`) e a flag `mustChangePassword` são enforçados **no servidor**, sempre a partir do **registro recarregado do banco** (fonte de verdade), tanto no login quanto em um middleware de guarda.

## 2.2 Layout do monorepo

Raiz: `c:\Users\INEX\source\repos\personal\focus`

```
focus/
├─ README.md                      # Português: instalar, rodar, credenciais, walkthrough, next steps
├─ .gitignore
├─ .nvmrc                         # fixa a versão de Node alvo (ex.: 22) — ver §2.3
├─ server/                        # Backend Node.js
│  ├─ package.json                # engines ">=20 <23"; deps PINADAS (better-sqlite3 ^12.2.0 etc.)
│  ├─ .env.example                # PORT, JWT_SECRET (default SOMENTE-DEMO), DB_PATH
│  ├─ data/                       # focus.db é criado aqui (gitignored)
│  └─ src/
│     ├─ index.js                 # bootstrap: cria app, migra, semeia, escuta
│     ├─ app.js                   # monta Express app (exportável p/ testes)
│     ├─ db.js                    # abre better-sqlite3, exporta instância
│     ├─ migrate.js               # cria tabelas (idempotente)
│     ├─ seed.js                  # semeia Dono + dados de exemplo (idempotente)
│     ├─ config.js                # lê env com defaults
│     ├─ errors.js                # classe AppError { status, codigo, mensagem }
│     ├─ auth/
│     │  ├─ tokens.js             # assina/verifica JWT
│     │  └─ password.js           # bcrypt hash/compare
│     ├─ middleware/
│     │  ├─ authenticate.js       # exige Bearer, RECARREGA usuário do banco, popula req.user
│     │  ├─ authorize.js          # checa role
│     │  ├─ requirePasswordChanged.js  # bloqueia se req.user.must_change_password (lê do banco)
│     │  ├─ recintoLock.js        # NO-OP hoje; seam p/ trava de recinto futura
│     │  └─ errorHandler.js       # middleware de erro central
│     ├─ routes/
│     │  ├─ auth.routes.js
│     │  ├─ accounts.routes.js
│     │  ├─ instrutores.routes.js
│     │  ├─ alunos.routes.js
│     │  └─ fichas.routes.js      # fichas + completions
│     ├─ validators.js            # validação de entrada por endpoint
│     └─ repositories/            # queries SQL por entidade
│        ├─ users.repo.js
│        ├─ fichas.repo.js
│        ├─ exercicios.repo.js
│        └─ completions.repo.js
└─ app/                           # Expo (React Native + Expo Router)
   ├─ package.json
   ├─ app.json
   ├─ app.config.js               # injeta API_BASE_URL via extra
   └─ src/
      ├─ config.ts                # exporta API_BASE_URL (de env/extra, default localhost)
      ├─ api/client.ts            # fetch wrapper com token + base URL
      ├─ api/erros.ts             # mapa codigo→mensagem pt-BR
      ├─ auth/AuthContext.tsx     # estado de sessão, persistência de token, reidratação
      ├─ storage.ts               # wrapper secure-store/localStorage
      └─ app/                     # rotas Expo Router
         ├─ _layout.tsx           # provê Auth + React Query; ÚNICO guard de rota (por flag/estado/role)
         ├─ index.tsx             # só renderiza spinner enquanto a sessão reidrata (não decide rota)
         ├─ login.tsx
         ├─ solicitar-conta.tsx   # aluno: criar solicitação
         ├─ trocar-senha.tsx      # instrutor: troca obrigatória
         ├─ (aluno)/
         │  ├─ treino.tsx         # ver ficha + marcar séries
         │  └─ progresso.tsx
         ├─ (instrutor)/
         │  ├─ alunos.tsx         # lista de alunos
         │  └─ ficha/[alunoId].tsx  # criar/editar ficha
         └─ (dono)/
            ├─ solicitacoes.tsx   # aprovar/rejeitar
            ├─ instrutores.tsx    # cadastrar instrutor
            └─ visao-geral.tsx    # alunos + instrutores
```

Decisão: **monorepo simples com duas pastas irmãs** (`server/` e `app/`), sem workspaces npm. Motivo: mantém cada projeto com seu próprio `package.json`/lockfile e comandos independentes — mais simples para a demo e evita o acoplamento de ferramentas de workspace. Alternativa considerada: npm workspaces na raiz; rejeitada por adicionar complexidade sem ganho para um MVP de duas apps.

## 2.3 Stack de bibliotecas (travada)

**Versão de Node alvo (travada):** **Node.js LTS 20.x ou 22.x**. Registrada em `.nvmrc` (`22`) e em `server/package.json` → `"engines": { "node": ">=20 <23" }`. Essa decisão, combinada com a **versão pinada de `better-sqlite3` abaixo**, resolve o risco de build nativo.

> **Versões de runtime do backend pinadas (não usar ranges abertos — finding 1).** `server/package.json` fixa, no mínimo: `"better-sqlite3": "^12.2.0"`, `"express": "^4.19.0"`, `"bcryptjs": "^2.4.3"`, `"jsonwebtoken": "^9.0.2"`, `"cors": "^2.8.5"`, `"dotenv": "^16.4.0"`. A afirmação "zero compilação local" é sobre a **linha 12.x** especificamente, não sobre o pacote em aberto.

**Backend:**
- `express` — roteamento HTTP.
- `better-sqlite3@^12.2.0` — driver SQLite síncrono, simples e rápido; sem pool nem async boilerplate, ideal para servidor local single-process. **É um módulo nativo (N-API)**; para evitar compilação local ele é instalado via **prebuild**.

  **Decisão de versão (finding 1, verificado contra o registro npm):** a versão default (`latest`) hoje é `better-sqlite3@13.0.3`, que declara `engines: { node: ">=22" }` (**NÃO suporta Node 20**), **não** tem script `install` e **não** usa `prebuild-install` — ou seja, não corresponde ao fluxo de prebuild descrito aqui e contradiz o `engines: ">=20 <23"` do `server/package.json`. Já a linha **12.x** (`better-sqlite3@12.2.0+`) declara `engines: { node: "20.x || 22.x || 23.x || 24.x" }` e `install: "prebuild-install || node-gyp rebuild --release"` — **este** é o mecanismo que entrega a promessa "Node 20.x ou 22.x sem compilação". Portanto **pinamos `"better-sqlite3": "^12.2.0"`** (Opção A da revisão: manter suporte a Node 20). O `^12` permanece dentro da linha 12.x (SemVer não sobe para 13.x automaticamente), preservando `engines`, `.nvmrc` e a promessa de prebuild.

  Com a 12.x pinada, `npm install` na versão de Node alvo baixa o binário pronto via `prebuild-install` e **não** aciona `node-gyp`/Visual Studio Build Tools. O ambiente de dev tem Node v24.19.0, mas o alvo de execução é LTS 20/22; o README instrui `nvm use` / instalar o LTS.

  **Contingência (não verificável offline — ver "Unverified Assumptions" da revisão):** o download do prebuilt para a tripla `win32-x64` + Node alvo não pôde ser confirmado aqui (só os metadados do pacote). Se, na máquina alvo, o `npm install` tentar compilar (prebuilt ausente para a plataforma), o plano B é `node:sqlite` (ver abaixo). O README documenta ambos.

  Alternativas consideradas:
  - `better-sqlite3@13.x` (latest): rejeitada porque exigiria dropar o suporte a Node 20 (`engines >=22`) e reescrever o mecanismo de install — contrário à promessa já estabelecida de "Node 20.x ou 22.x".
  - `node:sqlite` (nativo do Node 22+/24, zero dependência externa): **verificado disponível** neste ambiente, porém ainda **experimental** (emite `ExperimentalWarning`, API pode mudar entre minors) e com API diferente de `better-sqlite3`. Rejeitado para o produto da demo por instabilidade de API; permanece como **plano B** caso o prebuild da 12.x falhe na máquina alvo (ver nota de contingência no README) — note que o plano B requer Node 22+, reduzindo o alvo nesse cenário.
  - `sqlite3` (assíncrono por callback) — rejeitado por verbosidade e também ser nativo.
  - `bcrypt` (nativo) — rejeitado; `bcryptjs` (abaixo) é JS puro e não acrescenta superfície nativa.

  **Nota sobre "zero compilação":** a stack **não** promete "zero módulos nativos"; promete "**zero compilação local**", garantida por (1) usar apenas um módulo nativo com prebuild confiável (`better-sqlite3@12.x`, versão pinada), (2) fixar a versão de Node à faixa com prebuild, e (3) usar `bcryptjs` (JS puro) em vez de `bcrypt` para **não adicionar um segundo** módulo nativo.
- `bcryptjs@^2.4.3` — hash de senha em JS puro (sem toolchain nativo). Evita acrescentar um segundo módulo nativo ao projeto.
- `jsonwebtoken@^9.0.2` — tokens assinados.
- `cors@^2.8.5` — liberar o app web.
- `dotenv@^16.4.0` — ler `.env`.

**Cliente (Expo):**
- `expo`, `expo-router`, `react-native`, `react`, `react-dom`, `react-native-web`.
- `@tanstack/react-query` — cache/estado de servidor.
- `expo-secure-store` (nativo) + `localStorage` (web) via wrapper `storage.ts`.
- `expo-constants` — ler `extra.apiBaseUrl` do `app.config.js`.

**Testes (backend):** `node --test` (runner nativo) + `supertest`. Sem framework extra.

## 2.4 URL base configurável

`app/app.config.js` lê `process.env.EXPO_PUBLIC_API_BASE_URL` e injeta em `expo.extra.apiBaseUrl`, com default `http://localhost:3000`. `app/src/config.ts`:

```ts
import Constants from "expo-constants";
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  "http://localhost:3000";
```

Para rodar no celular via Expo Go, o usuário define `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-do-PC>:3000` antes de `expo start`. Documentado no README. Decisão: usar o prefixo `EXPO_PUBLIC_` (embutido no bundle pelo Expo) por ser o mecanismo oficial e funcionar igual em web e nativo.

## 2.5 Esquema SQLite

Criado por `migrate.js` com `CREATE TABLE IF NOT EXISTS`. `PRAGMA foreign_keys = ON` é setado na abertura da conexão.

### Tabela `users`
Contas de todos os papéis (tabela única com discriminador `role`).

| coluna | tipo | restrições | observação |
|---|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT | |
| `role` | TEXT | NOT NULL, CHECK(`role` IN ('aluno','instrutor','dono')) | |
| `nome` | TEXT | NOT NULL | |
| `matricula` | TEXT | UNIQUE (nullable) | obrigatório só p/ aluno; NULL p/ outros |
| `login` | TEXT | UNIQUE (nullable) | identificador de login p/ instrutor/dono; aluno loga por `matricula` |
| `senha_hash` | TEXT | NOT NULL | bcrypt |
| `status` | TEXT | NOT NULL DEFAULT 'pendente', CHECK IN ('pendente','aprovado','rejeitado') | ver regra abaixo — o default é o valor **seguro** p/ aluno |
| `must_change_password` | INTEGER | NOT NULL DEFAULT 0 | 1 = forçar troca (instrutor recém-criado) |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) | |

Regras: aluno usa `matricula` como credencial de login (e `login` fica NULL); instrutor/dono usam `login` (e `matricula` fica NULL). Enforçado na aplicação, não por CHECK composto, para manter o schema simples.

**Default de `status` no lado seguro (finding 2).** O default da coluna é **`'pendente'`**, não `'aprovado'`. Motivo: o fluxo mais crítico do MVP (RF-05/RF-06) é o auto-cadastro de aluno, que **deve** nascer `pendente`; deixar o default em `'aprovado'` cria um conflito latente em que um INSERT que omita a coluna produziria um aluno aprovado — exatamente o bug a evitar. Com o default `'pendente'`, quem nasce aprovado é a exceção (instrutor/dono), e esses caminhos (seed e `POST /instrutores`) **setam `status='aprovado'` explicitamente**. Reforço em duas frentes:
- **Solicitação de aluno:** `users.repo.criarSolicitacaoAluno` insere `status='pendente'` **explicitamente** (não confia no default), tornando a invariante independente do valor default. Ver §2.7 e o critério de aceitação correspondente.
- **Instrutor/Dono:** o seed e a rota de criação de instrutor passam `status='aprovado'` explicitamente.

Assim, tanto o default quanto os INSERTs explícitos apontam para o lado seguro; nenhum caminho produz aluno aprovado por omissão.

### Tabela `fichas`
Uma ficha de treino pertence a um aluno, criada por um instrutor.

| coluna | tipo | restrições |
|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT |
| `aluno_id` | INTEGER | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `instrutor_id` | INTEGER | NOT NULL, FK → users(id) |
| `titulo` | TEXT | NOT NULL |
| `ativa` | INTEGER | NOT NULL DEFAULT 1 |
| `created_at` | TEXT | NOT NULL DEFAULT (datetime('now')) |
| `updated_at` | TEXT | NOT NULL DEFAULT (datetime('now')) |

Índices:
- `idx_fichas_aluno` em `(aluno_id, ativa)`.
- **`uq_ficha_ativa`**: `CREATE UNIQUE INDEX IF NOT EXISTS uq_ficha_ativa ON fichas(aluno_id) WHERE ativa = 1;` — **índice único parcial** que impõe no banco a invariante "no máximo uma ficha ativa por aluno" (finding A5). A rota também desativa as demais em transação (defesa em profundidade); o índice é a última linha de defesa.

### Tabela `exercicios`
Exercícios de uma ficha.

| coluna | tipo | restrições |
|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT |
| `ficha_id` | INTEGER | NOT NULL, FK → fichas(id) ON DELETE CASCADE |
| `nome` | TEXT | NOT NULL |
| `series` | INTEGER | NOT NULL, CHECK(`series` >= 1) |
| `repeticoes` | TEXT | NOT NULL | texto p/ aceitar "8-12", "até a falha" etc. |
| `carga` | TEXT | NULL | texto p/ aceitar "20kg", "peso do corpo" |
| `observacoes` | TEXT | NULL |
| `ordem` | INTEGER | NOT NULL DEFAULT 0 | ordenação na ficha |

Índice: `idx_exercicios_ficha` em `(ficha_id, ordem)`.

### Tabela `completions`
Rastreamento de conclusão por série de um exercício, por aluno.

| coluna | tipo | restrições |
|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT |
| `exercicio_id` | INTEGER | NOT NULL, FK → exercicios(id) ON DELETE CASCADE |
| `aluno_id` | INTEGER | NOT NULL, FK → users(id) ON DELETE CASCADE |
| `serie_numero` | INTEGER | NOT NULL, CHECK(`serie_numero` >= 1) |
| `concluido_em` | TEXT | NOT NULL DEFAULT (datetime('now')) |

Restrição de unicidade: `UNIQUE(exercicio_id, aluno_id, serie_numero)` — marcar a mesma série duas vezes é idempotente (INSERT OR IGNORE); desmarcar é DELETE da linha. O "progresso" é derivado: para cada exercício, `COUNT(completions)` vs `series`.

**Preservação de progresso na edição de ficha (finding A3):** a FK `exercicio_id ON DELETE CASCADE` significa que apagar um exercício apaga suas `completions`. Por isso o `PUT /fichas/:fichaId/exercicios` **não** apaga-e-recria todo o conjunto; ele **reconcilia por `id`** (ver §2.7): exercícios com `id` existente sofrem UPDATE (preservando `completions`), exercícios sem `id` sofrem INSERT, e só os exercícios ausentes do payload sofrem DELETE (aí sim o cascade remove as `completions` deles — comportamento desejado, pois o exercício deixou de existir).

### Relacionamentos (resumo)
- `users` 1—N `fichas` (como aluno via `aluno_id`; como instrutor via `instrutor_id`).
- `fichas` 1—N `exercicios`.
- `exercicios` 1—N `completions`; `users`(aluno) 1—N `completions`.

## 2.6 Esquema de autenticação e senhas

- **Hash:** `bcryptjs` com cost 10. `password.js` expõe `hash(senha)` e `verify(senha, hash)`. Senha nunca trafega nem é logada.
- **Token:** JWT assinado com `JWT_SECRET` (de `.env`, com default de dev documentado). Payload: `{ sub: userId, role }`, `expiresIn: '12h'`. **Aviso de segurança (finding 8):** o `JWT_SECRET` default e as senhas de seed (`dono123` etc.) são **somente para demonstração em LAN de testes**; `.env.example` e o README deixam isso explícito e instruem a trocá-los antes de qualquer uso fora do ambiente de demo — evitando que o default vire débito de segurança silencioso quando o seam de "recinto" for ativado. **O payload NÃO carrega `mustChangePassword` como fonte de autoridade** (ver enforcement abaixo). Decisão: JWT em vez de sessão em memória porque é stateless, sobrevive a restart do servidor e é trivial de enviar do cliente; o custo (não revogável até expirar) é aceitável para a demo.
- **Transporte:** header `Authorization: Bearer <token>`.

### Resolução de credencial no login (finding A10)
O `POST /auth/login` recebe um único campo `credencial`. O servidor resolve o usuário com **uma** consulta: `SELECT * FROM users WHERE matricula = ? OR login = ?` (mesmo valor nos dois binds). Como `matricula` e `login` são ambos `UNIQUE` e os formatos divergem (matrícula numérica/texto curto, login é slug `[a-z0-9._-]`), colisão é improvável. Se a query retornar mais de uma linha (colisão teórica), o servidor trata como credencial inválida → `401 CREDENCIAIS_INVALIDAS`. Documentado também na §2.11.

### Enforcement server-side dos estados (findings A1, A6)
**Fonte de verdade é sempre o registro recarregado do banco**, nunca o claim do token. `authenticate.js` decodifica o JWT apenas para obter `sub` (userId) e então faz `SELECT` do usuário atual, populando `req.user` com `status` e `must_change_password` **frescos do banco**. Isso elimina qualquer risco de claim velho (finding A6).

Centralizado para evitar divergência entre login e rotas:

1. **No login (`/auth/login`):**
   - Credencial inválida / senha errada → `401 CREDENCIAIS_INVALIDAS` (mensagem genérica).
   - Aluno com `status='pendente'` → `403 CONTA_PENDENTE` (sem token).
   - Aluno com `status='rejeitado'` → `403 CONTA_REJEITADA` (sem token).
   - Caso ok → `200` com token + `user` (inclui `mustChangePassword` lido do banco). Se `must_change_password=1`, o token é emitido normalmente; o cliente é direcionado à troca; as rotas protegidas bloqueiam (ver item 3).
2. **Em `authenticate.js`:** recarrega o usuário do banco; se o aluno deixou de estar `aprovado` desde a emissão do token → `403 CONTA_NAO_APROVADA`.
3. **Em `requirePasswordChanged.js`:** se `req.user.must_change_password=1` (lido do banco), a rota responde `409 SENHA_DEVE_SER_TROCADA`. Aplicado às rotas protegidas **exceto** três rotas de "autogestão": `POST /auth/change-password`, `POST /auth/logout` e **`GET /auth/me`** (finding A1) — esta última para o app conseguir reidratar a sessão e descobrir que precisa ir para `/trocar-senha` após um restart.

**Fluxo de troca (finding A6):** `POST /auth/change-password` faz UPDATE de `senha_hash`, zera `must_change_password` no banco e **reemite e retorna um JWT novo** (`200 { ok:true, token, user }`). Como o enforcement lê do banco, mesmo o token antigo já passaria; mas reemitir mantém o payload coerente e evita confusão. Não há loop de 409.

A camada que **possui** cada invariante:
- Unicidade de `matricula`/`login`: banco (constraint UNIQUE) + checagem amigável na rota.
- Estado da conta de aluno: camada de rota/middleware do servidor, sempre lendo do banco (cliente nunca é confiável).
- `mustChangePassword`: middleware do servidor, lendo do banco.
- "No máximo uma ficha ativa por aluno": banco (índice único parcial `uq_ficha_ativa`) + rota (desativa as demais em transação).
- Dono único: `seed.js` (idempotente) — ver 2.8.

## 2.7 Endpoints REST

Base: `http://<host>:3000`. Corpo e resposta em JSON. Erros no formato `{ "erro": { "codigo": "STRING", "mensagem": "texto em pt-BR" } }`.

Legenda auth: **—** público · **T** requer token · **T+dono/instrutor/aluno** requer token e role.

### Autenticação
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/auth/login` | — | `{ credencial, senha }` (credencial = matrícula p/ aluno ou login p/ instrutor/dono; resolução em §2.6) | `200 { token, user:{ id, nome, role, mustChangePassword } }` · `401 CREDENCIAIS_INVALIDAS` · `403 CONTA_PENDENTE`/`CONTA_REJEITADA` |
| POST | `/auth/change-password` | T (isenta de requirePasswordChanged) | `{ senhaAtual, novaSenha }` | `200 { ok:true, token, user }` (zera `must_change_password` e **reemite token**) · `400 SENHA_FRACA`/`NOVA_SENHA_IGUAL` · `401 SENHA_ATUAL_INVALIDA` |
| POST | `/auth/logout` | T (isenta) | — | `200 { ok:true }` (no-op stateless; cliente descarta token) |
| GET | `/auth/me` | T (**isenta de requirePasswordChanged** — finding A1) | — | `200 { user:{ id, nome, role, mustChangePassword, status } }` |

### Solicitações de conta (aluno)
Máquina de estados (finding A8): transições válidas são **`pendente → aprovado`** (approve) e **`pendente → rejeitado`** (reject). Qualquer approve/reject sobre conta que **não** esteja `pendente` → `409 ESTADO_INVALIDO` (não há idempotência nem reabertura). Uma matrícula com conta `rejeitada` permanece `UNIQUE` ocupada: nova solicitação com a mesma matrícula retorna `409 MATRICULA_EM_USO`. Reabertura está **fora de escopo** (§1.6).

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/accounts/requests` | — | `{ matricula, nome, senha }` | `201 { id, status:"pendente" }` — o INSERT grava `status='pendente'` **explicitamente** (finding 2), nunca confia no default do schema · `409 MATRICULA_EM_USO` · `400 DADOS_INVALIDOS` |
| GET | `/accounts/requests?status=pendente` | T+dono | — | `200 { requests:[{ id, nome, matricula, status, created_at }] }` |
| POST | `/accounts/requests/:id/approve` | T+dono | — | `200 { id, status:"aprovado" }` · `404 NAO_ENCONTRADO` · `409 ESTADO_INVALIDO` (não-pendente) |
| POST | `/accounts/requests/:id/reject` | T+dono | `{ motivo? }` | `200 { id, status:"rejeitado" }` · `404 NAO_ENCONTRADO` · `409 ESTADO_INVALIDO` (não-pendente) |

### Instrutores (dono)
| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/instrutores` | T+dono | `{ nome, login, senhaPadrao }` | `201 { id, nome, login, mustChangePassword:true }` · `409 LOGIN_EM_USO` · `400 DADOS_INVALIDOS` |
| GET | `/instrutores` | T+dono | — | `200 { instrutores:[{ id, nome, login, mustChangePassword }] }` |

### Alunos (dono + instrutor)

**Filtro de status por role (finding 3).** A query `?status=` é interpretada conforme o papel:
- **instrutor:** o servidor **força `status='aprovado'`** e **ignora** qualquer `?status` recebido. RF-11 diz que o instrutor vê apenas alunos aprovados, e é para alunos aprovados que ele monta ficha; o filtro é imposto no servidor, não confiado ao cliente.
- **dono:** pode usar `?status=pendente|aprovado|rejeitado` para a visão geral; sem query, o default para o dono é **retornar todos os status** (a tela "Visão geral" lista todos; "Solicitações" filtra `pendente`).

**Escopo de `:id` como aluno (finding 4).** Em qualquer rota `/alunos/:id/...`, se `:id` não existir **ou não for `role='aluno'`** (ex.: aponta para um instrutor/dono), o servidor responde **`404 NAO_ENCONTRADO`** antes de qualquer consulta de fichas/progresso. Isso unifica o critério "é aluno" e evita o comportamento indefinido de retornar lista vazia para um `:id` que é instrutor.

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/alunos` | T+(dono\|instrutor) | query `?status=` (interpretada por role — ver acima) | `200 { alunos:[{ id, nome, matricula, status }] }` (instrutor: só `aprovado`) |
| GET | `/alunos/:id` | T+(dono\|instrutor) | — | `200 { aluno }` · `404 NAO_ENCONTRADO` (inexistente ou não é aluno) |

### Fichas e exercícios
Regra de autorização e escopo de leitura de ficha:
- **`:id` deve ser um aluno (finding 4):** para qualquer role, se `:id` não existir ou não for `role='aluno'`, responde **`404 NAO_ENCONTRADO`** antes de consultar fichas (mesma regra de §Alunos). Isso cobre `GET /alunos/:id/fichas`, `/progresso` e `POST /alunos/:id/fichas`.
- **Aluno só vê o próprio `id`:** se `req.user.role === 'aluno'`, exige-se `req.user.id === :id`; caso contrário responde **`404 NAO_ENCONTRADO`** (padronizado para não revelar existência de dados de terceiros). A mesma regra vale para `/progresso`.
- **`:fichaId` deve pertencer ao `:id`:** quando um `:fichaId` é usado, ele **deve pertencer** ao `:id` da rota; senão `404 NAO_ENCONTRADO`.

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/alunos/:id/fichas` | T+(instrutor\|dono\|aluno-dono) | — | `200 { fichas:[{ id, titulo, ativa, exercicios:[{ id, nome, series, repeticoes, carga, observacoes, ordem, seriesConcluidas:[n...] }] }] }` (inclui `seriesConcluidas` por exercício — finding A11) · `404 NAO_ENCONTRADO` (aluno pedindo dados de outro; `:id` não é aluno — finding 4) |
| POST | `/alunos/:id/fichas` | T+instrutor | `{ titulo, ativa?, exercicios:[{ nome, series, repeticoes, carga?, observacoes?, ordem? }] }` | `201 { ficha }` · `404 ALUNO_NAO_ENCONTRADO` (`:id` inexistente ou não é `role='aluno'` — finding 4) · `409 ALUNO_NAO_APROVADO` (aluno existe mas `status<>'aprovado'` — finding 3) · `400 DADOS_INVALIDOS` |
| PUT | `/fichas/:fichaId` | T+instrutor | `{ titulo?, ativa? }` | `200 { ficha }` · `404 NAO_ENCONTRADO` |
| PUT | `/fichas/:fichaId/exercicios` | T+instrutor | `{ exercicios:[{ id?, nome, series, repeticoes, carga?, observacoes?, ordem? }] }` (reconcilia por `id`) | `200 { ficha }` · `404 NAO_ENCONTRADO` · `400 DADOS_INVALIDOS` |
| DELETE | `/fichas/:fichaId` | T+instrutor | — | `200 { ok:true }` · `404 NAO_ENCONTRADO` |

**Invariante de ficha ativa (finding A5):** ao `POST` uma ficha com `ativa` (default `1`) ou ao `PUT /fichas/:fichaId` com `ativa:true`, o servidor executa, **numa transação `better-sqlite3`**, `UPDATE fichas SET ativa=0 WHERE aluno_id=? AND id<>?` antes de ativar a alvo, garantindo no máximo uma ativa. O índice único parcial `uq_ficha_ativa` (§2.5) é a rede de segurança: se a transação falhar na constraint, a rota responde `409 ESTADO_INVALIDO`.

**Semântica de `PUT /fichas/:fichaId/exercicios` (finding A3):** reconciliação por `id`, dentro de uma transação:
- cada item **com `id`** que pertence à ficha → `UPDATE` dos campos (preserva `completions`);
- cada item **sem `id`** → `INSERT` (novo exercício, começa sem `completions`);
- cada exercício existente da ficha **ausente** do payload → `DELETE` (cascade remove apenas as `completions` desse exercício removido);
- item com `id` que **não** pertence à ficha → `400 DADOS_INVALIDOS`.
Assim o progresso dos exercícios mantidos é preservado (CA #13). A tela `ficha/[alunoId].tsx` ainda exibe aviso textual: "Excluir um exercício apaga o progresso registrado dele."

### Rastreamento de conclusão (aluno)
Validação comum a POST e DELETE: `exercicioId` deve existir e pertencer a um exercício de uma ficha do **próprio** aluno autenticado (senão `404 NAO_ENCONTRADO`); `serieNumero` inteiro no intervalo `1..series` do exercício (senão `400 DADOS_INVALIDOS`). O servidor obtém `aluno_id` de `req.user.id` (o aluno só marca a própria conclusão); não aceita `aluno_id` do cliente.

**Transporte do corpo (finding 6).** Tanto `POST /completions` quanto `DELETE /completions` recebem `{ exercicioId, serieNumero }` no **corpo JSON** com `Content-Type: application/json`. O backend lê `req.body` também no DELETE (Express/`express.json()` parseia corpo de DELETE normalmente). Decisão: usar corpo JSON em ambos por simetria com o POST e para manter o `api/client.ts` do cliente uniforme; o cliente `fetch` nativo (web e React Native) envia corpo em DELETE sem proxies intermediários na LAN, então o risco histórico de "proxy descarta body de DELETE" não se aplica a este cenário. Alternativa equivalente considerada e rejeitada por assimetria: `DELETE /completions?exercicioId=&serieNumero=` via query string.

| Método | Path | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/completions` | T+aluno | `{ exercicioId, serieNumero }` | `201 { ok:true }` (idempotente, INSERT OR IGNORE) · `404 NAO_ENCONTRADO` (exercício inexistente ou de outro aluno) · `400 DADOS_INVALIDOS` (serieNumero fora do intervalo) |
| DELETE | `/completions` | T+aluno | `{ exercicioId, serieNumero }` (corpo JSON — finding 6) | `200 { ok:true }` (**idempotente**: `200` mesmo se nada foi apagado — finding A7) · `404 NAO_ENCONTRADO` · `400 DADOS_INVALIDOS` |
| GET | `/alunos/:id/fichas/:fichaId/progresso` | T+(aluno-dono\|instrutor\|dono) | — | `200 { exercicios:[{ exercicioId, series, concluidas, seriesConcluidas:[n...] }], totalSeries, totalConcluidas, percentual }` · `404 NAO_ENCONTRADO` (aluno pedindo dados de outro; `:id` não é aluno; ou `fichaId` não pertence ao `:id`) |

**Cálculo de `percentual` (finding 9).** `totalSeries = Σ series` de todos os exercícios da ficha; `totalConcluidas = Σ` conclusões (contadas uma vez por `(exercicio, serie)`). `percentual = Math.round(100 * totalConcluidas / totalSeries)`, inteiro em `0..100`. Caso `totalSeries === 0` (ficha sem exercícios), `percentual = 0` (evita divisão por zero). O arredondamento é **meio-para-cima** (`Math.round`), tornando o valor determinístico para os testes.

## 2.8 Estratégia de seed

`seed.js` roda após `migrate.js` no boot, de forma **idempotente** (usa checagem por `login`/`matricula` antes de inserir):

1. **Dono único:** se não existir nenhum usuário com `role='dono'`, cria um:
   - `login: dono` · `senha: dono123` · `nome: "Dono da Academia"` · `status: aprovado` · `must_change_password: 0`.
   - **Credenciais documentadas no README.** Idempotência garante "exatamente um" em runs repetidos.
2. **Instrutor de exemplo:** `login: instrutor` · `senha: instrutor123` · `must_change_password: 1` (demonstra a troca obrigatória).
3. **Aluno de exemplo (aprovado):** `matricula: 2024001` · `senha: aluno123` · `status: aprovado`.
4. **Aluno pendente de exemplo:** `matricula: 2024002` · `nome: "Aluno Pendente"` · `status: pendente` (demonstra aprovação). _Sem senha de login útil até aprovação; senha seed `aluno123` para após aprovar._
5. **Ficha de exemplo** para o aluno aprovado, criada pelo instrutor de exemplo, `ativa=1`, com 3 exercícios:
   - Supino reto — 4 séries — 8-12 — 20kg
   - Agachamento — 4 séries — 10 — barra
   - Remada curvada — 3 séries — 12 — 15kg
6. **Progresso parcial de exemplo:** marcar **exatamente 2 das 4 séries** do primeiro exercício (Supino reto) como `completions` do aluno aprovado. A ficha tem `4+4+3 = 11` séries no total; logo, pela fórmula de §2.7, `percentual = Math.round(100 * 2 / 11) = Math.round(18.18) = 18` (**18% geral** — finding 9, valor exato e determinístico) e `50%` no primeiro exercício. A demo já exibe progresso sem precisar interagir, e o teste de derivação espera exatamente `18`.

Todas as senhas de seed são **hasheadas** com bcrypt antes de inserir. O arquivo DB default é `server/data/focus.db` (configurável via `DB_PATH`).

## 2.9 Mapa de telas do app (por papel, UI em pt-BR)

**Reidratação de sessão (finding A1):** no boot, `AuthContext` lê o token persistido do `storage.ts`. Se houver token, chama **`GET /auth/me`** (isenta de `requirePasswordChanged`) para obter `role`, `status` e `mustChangePassword` frescos; com isso `_layout.tsx` decide a rota. Se `/auth/me` retornar `401` (token expirado/inválido), limpa a sessão e vai para `/login`. Essa é a única fonte de reidratação — não se confia em claim do JWT para `mustChangePassword`.

**Fronteira de responsabilidade de roteamento (finding 7).** `_layout.tsx` é a **única fonte de decisão de rota** (guard): ele observa o estado do `AuthContext` e aplica as regras abaixo via `<Redirect>`. `index.tsx` **não decide destino** — enquanto a sessão está reidratando (`GET /auth/me` em voo), ele apenas renderiza um **spinner** ("Carregando..."); quando a reidratação conclui, o guard do `_layout.tsx` já terá redirecionado. Isso elimina redirecionamento duplo/piscada.

Roteamento (guard em `_layout.tsx`), nesta ordem de precedência:
1. reidratação em andamento → permanece em `index.tsx` (spinner).
2. sem sessão → `/login`.
3. **com sessão e `mustChangePassword===true` (independente do role — finding 5)** → força `/trocar-senha` (único destino permitido até trocar). A condição é por **flag**, espelhando exatamente o enforcement por-flag do servidor (`requirePasswordChanged` roda em todas as rotas protegidas, não só para instrutor). Assim, se qualquer usuário (não só instrutor) tiver a flag ligada, o cliente o leva à troca em vez de entrar em deadlock de 409.
4. senão, roteia pelo grupo do papel: `aluno`→`(aluno)/treino`, `instrutor`→`(instrutor)/alunos`, `dono`→`(dono)/solicitacoes`.

> **Invariante complementar (documentada):** hoje apenas instrutores recém-criados nascem com `must_change_password=1`; nenhum outro fluxo liga a flag (seed do dono e solicitação de aluno gravam `0`). Ainda assim, o redirecionamento é por-flag (não por role) para que cliente e servidor nunca divirjam caso a flag passe a ser usada em outro fluxo no futuro.

**Públicas / comuns**
- `login.tsx` — "Entrar": campos Credencial (matrícula ou login) e Senha; link "Solicitar conta de aluno". Mensagens de erro em pt-BR mapeadas dos códigos via `api/erros.ts` (ex.: `CONTA_PENDENTE` → "Sua conta ainda está em análise pelo dono da academia.").
- `solicitar-conta.tsx` — "Solicitar conta": Matrícula, Nome, Senha → feedback "Solicitação enviada! Aguarde a aprovação do dono."
- `trocar-senha.tsx` — "Trocar senha" (obrigatória no 1º acesso; na prática só instrutores recém-criados chegam aqui, mas a tela não depende do role — finding 5): Senha atual, Nova senha, Confirmar. Ao sucesso, guarda o **token reemitido** retornado por `change-password` (com `mustChangePassword:false`) e o guard do `_layout.tsx` roteia para o grupo do **próprio role** do usuário.

**Aluno** (grupo `(aluno)`)
- `treino.tsx` — "Meu treino": consome `GET /alunos/:id/fichas` (que já traz `seriesConcluidas` por exercício — finding A11), renderiza a ficha `ativa` com checkboxes por série já marcados; marcar/desmarcar → POST/DELETE `/completions` e invalida a query no React Query. Evita o segundo round-trip ao `/progresso`.
- `progresso.tsx` — "Progresso": percentual concluído por exercício e geral (de `GET .../progresso`).

**Instrutor** (grupo `(instrutor)`)
- `alunos.tsx` — "Alunos": lista de alunos aprovados; tocar abre a ficha.
- `ficha/[alunoId].tsx` — "Ficha de treino": criar/editar título e lista de exercícios (adicionar/remover/reordenar; salvar → POST/PUT com reconciliação por `id`). Exibe aviso de que excluir exercício apaga o progresso dele.

**Dono** (grupo `(dono)`)
- `solicitacoes.tsx` — "Solicitações": lista pendentes com botões "Aprovar"/"Rejeitar".
- `instrutores.tsx` — "Instrutores": lista + formulário "Cadastrar instrutor" (Nome, Login, Senha padrão).
- `visao-geral.tsx` — "Visão geral": contagens e listas de alunos e instrutores.

Navegação entre telas do mesmo papel via tabs/stack do Expo Router; botão "Sair" (logout) no cabeçalho de todos os grupos.

## 2.10 Tratamento de erros (concreto por operação)

Formato único de erro: `{ erro: { codigo, mensagem } }`, HTTP status coerente. Erros tipados via `errors.js` (`AppError { status, codigo, mensagem }`), tratados por `middleware/errorHandler.js`. Log no servidor em nível `warn` para 4xx esperados e `error` para 5xx inesperados; **nunca** logar senha ou hash.

| Operação | Falha | Tipo | Resposta ao chamador | Log |
|---|---|---|---|---|
| Login | credencial não existe / senha errada / colisão de credencial | recuperável | `401 CREDENCIAIS_INVALIDAS` (genérica) | warn |
| Login | aluno pendente | recuperável | `403 CONTA_PENDENTE` | warn |
| Login | aluno rejeitado | recuperável | `403 CONTA_REJEITADA` | warn |
| Qualquer rota protegida | token ausente/expirado/inválido | recuperável | `401 TOKEN_INVALIDO` | warn |
| Rota protegida | aluno deixou de estar aprovado | recuperável | `403 CONTA_NAO_APROVADA` | warn |
| Rota protegida | role insuficiente | recuperável | `403 ACESSO_NEGADO` | warn |
| Rota protegida (instrutor, exceto change-password/logout/me) | `must_change_password=1` | recuperável | `409 SENHA_DEVE_SER_TROCADA` | warn |
| Criar solicitação | matrícula já usada (inclui conta rejeitada) | recuperável | `409 MATRICULA_EM_USO` | warn |
| Criar solicitação | campos faltando/ inválidos | recuperável | `400 DADOS_INVALIDOS` (lista campos) | warn |
| Approve/reject | id inexistente | recuperável | `404 NAO_ENCONTRADO` | warn |
| Approve/reject | conta não está `pendente` | recuperável | `409 ESTADO_INVALIDO` | warn |
| Criar instrutor | login em uso | recuperável | `409 LOGIN_EM_USO` | warn |
| Trocar senha | senha atual errada | recuperável | `401 SENHA_ATUAL_INVALIDA` | warn |
| Trocar senha | nova senha < 6 chars | recuperável | `400 SENHA_FRACA` | warn |
| Trocar senha | nova senha **igual à atual** (finding A12) | recuperável | `400 NOVA_SENHA_IGUAL` ("A nova senha deve ser diferente da atual.") | warn |
| Criar/editar ficha | `:id` inexistente ou não é `role='aluno'` (finding 4) | recuperável | `404 ALUNO_NAO_ENCONTRADO` | warn |
| Criar ficha | `:id` é aluno mas não está `aprovado` (finding 3) | recuperável | `409 ALUNO_NAO_APROVADO` | warn |
| `GET /alunos` (instrutor) | instrutor tenta `?status=pendente`/`rejeitado` | — | query ignorada; retorna só `aprovado` (sem erro — finding 3) | — |
| Editar exercícios | item com `id` não pertence à ficha | recuperável | `400 DADOS_INVALIDOS` | warn |
| Ativar ficha | violação do índice único parcial | recuperável | `409 ESTADO_INVALIDO` | warn |
| Fichas/progresso | aluno pede dados de outro aluno; `:id` não é aluno; ou `fichaId` não pertence ao `:id` | recuperável | `404 NAO_ENCONTRADO` (findings A9 e 4, padronizado) | warn |
| Completion POST/DELETE | exercício inexistente ou de outro aluno | recuperável | `404 NAO_ENCONTRADO` | warn |
| Completion POST/DELETE | `serieNumero` fora de `1..series` | recuperável | `400 DADOS_INVALIDOS` | warn |
| DELETE completion | série não estava marcada | — | `200 { ok:true }` (idempotente — finding A7) | — |
| Qualquer | erro SQLite/inesperado | fatal p/ a request | `500 ERRO_INTERNO` (genérica) | error + stack |

Cliente: `api/client.ts` lê `erro.codigo` e exibe a mensagem pt-BR correspondente de `api/erros.ts`; falha de rede → "Não foi possível conectar ao servidor. Verifique se o servidor está ligado e o endereço da API."

## 2.11 Validação de entradas externas

Validação roda **na rota** (`validators.js`), antes de tocar o repositório. Falha retorna `400 DADOS_INVALIDOS` com lista de campos (salvo códigos específicos mapeados em §2.10). O banco faz a última defesa (CHECK/UNIQUE/FK).

| Campo | Regra |
|---|---|
| `matricula` | obrigatório; string não vazia; trim; único; máx 30 chars. |
| `nome` | obrigatório; 2–120 chars após trim. |
| `senha` (solicitação) | obrigatório; mín 6 chars. |
| `credencial`/`senha` (login) | obrigatórios; não vazios. Resolução: `WHERE matricula = ? OR login = ?`; colisão → `401` (finding A10). |
| `login` (instrutor) | obrigatório; 3–40 chars; único; slug `[a-z0-9._-]`. |
| `senhaPadrao` | obrigatório; mín 6 chars. |
| `senhaAtual` (change-password) | obrigatória; não vazia; conferida com o hash. |
| `novaSenha` | mín 6 chars; **diferente da atual** → senão `400 NOVA_SENHA_IGUAL` (finding A12). |
| `exercicios[].id` | opcional; inteiro positivo; se enviado, deve pertencer à ficha (senão `400 DADOS_INVALIDOS`). |
| `exercicios[].nome` | obrigatório; 1–120 chars. |
| `exercicios[].series` | inteiro ≥ 1 e ≤ 20. |
| `exercicios[].repeticoes` | obrigatório; 1–40 chars (texto). |
| `exercicios[].carga` / `observacoes` | opcional; ≤ 120 / ≤ 500 chars. |
| `serieNumero` (completion) | inteiro ≥ 1 e ≤ `series` do exercício (lookup obrigatório no POST e no DELETE — finding A7). |
| IDs de rota (`:id`, `:fichaId`) | inteiro positivo; senão `400 DADOS_INVALIDOS`. |

## 2.12 Costura para a trava de "recinto" (NÃO implementar agora)

`middleware/recintoLock.js` é um **no-op** hoje: `module.exports = (req,res,next) => next();`. Ele já é montado na cadeia das rotas protegidas e documentado como ponto único de extensão. Uma versão futura poderia validar IP de origem contra a sub-rede da LAN da academia, um header de dispositivo autorizado, ou geofencing — **sem** alterar rotas, pois a checagem está isolada nesse middleware. O README registra isso em "Próximos passos". Nenhum CA do MVP depende dele estar ativo.

## 2.13 Testabilidade

- **Unit (sem HTTP):** `password.js` (hash/verify round-trip), `tokens.js` (assina→verifica, expiração), `validators.js`, derivação de `percentual` do progresso (**valor esperado determinístico: 2 de 11 séries = `18`** — finding 9), e a **reconciliação de exercícios** (preservação de `completions`). Repositórios testáveis com SQLite em memória (`better-sqlite3(':memory:')`) rodando `migrate.js`.
- **Integração (HTTP):** `supertest` contra o Express exportado de `app.js` com DB em memória semeado — cobre os CAs 2–13 e 17: login por estado, aprovação/rejeição e máquina de estados (409 em não-pendente), troca de senha obrigatória com token reemitido, `/auth/me` acessível sob `mustChangePassword`, invariante de ficha ativa única, preservação de `completions` no PUT de exercícios, DELETE idempotente de completion, e `404` para aluno acessando dados de terceiros. Cada teste cria seu próprio DB isolado.
- **Cliente:** `api/client.ts` e `api/erros.ts` são funções puras testáveis; telas são integração manual na demo. A lógica de regra fica no servidor para concentrar os testes lá.
- Framework: `node --test` (nativo) + `supertest` no backend. Travado.

## 2.14 Comandos (resumo p/ o README)

- **Pré-requisito:** Node.js LTS **20.x ou 22.x** (o repo traz `.nvmrc` com `22`; `nvm use` seleciona). Combinado com `better-sqlite3` pinado em `^12.2.0` (§2.3), isso garante o download do prebuild e evita Build Tools. Contingência documentada: se o `npm install` tentar compilar na máquina alvo (prebuilt ausente para `win32-x64` + Node alvo), instalar o LTS indicado ou, em último caso, cair para o plano B `node:sqlite` (requer Node 22+).
- Servidor: `cd server && npm install && npm run start` → cria/semeia `focus.db`, escuta em `:3000`.
- App web: `cd app && npm install && npx expo start --web`.
- App no celular: setar `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:3000`, `npx expo start`, abrir no Expo Go.
- Credenciais do Dono semeado: login `dono` / senha `dono123`. (Instrutor de exemplo: `instrutor` / `instrutor123`, trocará a senha no 1º acesso. Aluno aprovado: matrícula `2024001` / `aluno123`.)
- **Aviso (finding 8):** essas credenciais e o `JWT_SECRET` default são **apenas para demonstração**; trocar antes de qualquer uso fora da LAN de testes. O README repete esse aviso em destaque.

---

# Parte 3 — Respostas à revisão

Revisão endereçada (a mais recente): `design-review.json` — veredito `CHANGES_REQUESTED`, **2 HIGH, 3 MEDIUM, 4 NIT**. Todos os 9 findings foram **resolvidos** no texto acima; nenhum foi mandado para backlog nem ignorado, pois todos cabem no escopo do MVP e alinham com os requisitos originais (RF-05/RF-06, RF-11) e com a promessa de stack travada.

Verifiquei pessoalmente o finding 1 contra o registro npm (`npm view better-sqlite3@13.0.3` e `@12.2.0`): confirmado que a 13.x declara `engines >=22`, sem script `install`/`prebuild-install`, enquanto a 12.x declara `engines 20.x||22.x||23.x||24.x` e `install: "prebuild-install || node-gyp rebuild --release"`. O finding procede integralmente.

| # | Sev | Resolução | Onde |
|---|---|---|---|
| 1 | HIGH | Adotada a **Opção A**: `better-sqlite3` pinado em `^12.2.0` (única linha que suporta Node 20 e usa o fluxo `prebuild-install` descrito), mantendo `engines ">=20 <23"`, `.nvmrc` e a promessa "Node 20.x ou 22.x". Demais deps de runtime do backend também pinadas. A 13.x foi explicitamente considerada e rejeitada (exigiria dropar Node 20). Contingência de prebuilt `win32-x64` documentada (plano B `node:sqlite`). | §1.2, §2.3, §2.14, CA #1 |
| 2 | HIGH | Default do schema de `users.status` invertido para **`'pendente'`** (lado seguro); a rota de solicitação de aluno **seta `status='pendente'` explicitamente** e instrutor/dono setam `'aprovado'` explicitamente no seed/rota. CA #3 ganha verificação de persistência (`SELECT status = 'pendente'`). | §2.5, §2.7, CA #3 |
| 3 | MED | `GET /alunos` para role **instrutor** força `status='aprovado'` e ignora `?status`; só o dono filtra livremente. `POST /alunos/:id/fichas` valida que o aluno está `aprovado`, senão `409 ALUNO_NAO_APROVADO`. | §2.7 (Alunos/Fichas), §2.10, §2.9, CA #18/#19 |
| 4 | MED | Escopo de `:id` padronizado: para **qualquer** role, se `:id` não existir ou não for `role='aluno'`, resposta `404 NAO_ENCONTRADO`/`ALUNO_NAO_ENCONTRADO` antes de consultar fichas — vale p/ `fichas`, `/progresso` e `POST .../fichas`. | §2.7, §2.10, CA #19/#20 |
| 5 | MED | Redirecionamento do cliente desacoplado do role: `_layout.tsx` força `/trocar-senha` sempre que `mustChangePassword===true` (**por flag, igual ao servidor**), eliminando o deadlock de 409. Invariante complementar documentada. | §2.9, §2.2 (comentário da árvore), CA #8/#10 |
| 6 | NIT | Fixado: `POST`/`DELETE /completions` recebem `{ exercicioId, serieNumero }` no corpo JSON com `Content-Type: application/json`; backend lê `req.body` no DELETE; alternativa por query string considerada e rejeitada por assimetria. | §2.7 (Rastreamento) |
| 7 | NIT | Fronteira de roteamento definida: `_layout.tsx` é o **único** guard de rota; `index.tsx` apenas renderiza spinner durante a reidratação. Comentário da árvore atualizado. | §2.9, §2.2 |
| 8 | NIT | `JWT_SECRET` default e senhas de seed marcados como **somente-demo** em `.env.example`, §2.6, §2.14 e no README (trocar antes de qualquer uso fora da LAN de testes). | §2.6, §2.14 |
| 9 | NIT | `percentual = Math.round(100 * totalConcluidas / totalSeries)` inteiro `0..100` (com guarda de divisão por zero). Seed recalculado: 2 de 11 séries = **18** (não "~17%"); CA #21 e teste esperam `18`. | §2.7, §2.8 item 6, §2.13, CA #21 |

Suposições verificadas nesta rodada: metadados de `better-sqlite3@12.2.0` e `@13.0.3` conferidos no npm (finding 1). O **download** do binário prebuilt para `win32-x64` + Node alvo permanece **não verificável offline** (só metadados disponíveis); por isso a contingência está documentada e deve ser validada na máquina alvo da academia. As verificações da revisão anterior (`node --version` v24.19.0, `require('node:sqlite')` carrega, `nvm` disponível) seguem válidas.

---

## Apêndice — respostas consolidadas à revisão anterior (13 findings)

Mantidas no corpo do documento; resumo para rastreabilidade:

| # | Sev | Resolução | Onde |
|---|---|---|---|
| A1 | HIGH | `GET /auth/me` isenta de `requirePasswordChanged`; reidratação via `/auth/me`, não via claim do JWT. | §2.6 item 3, §2.7, §2.9 |
| A2 | HIGH | Promessa "zero **compilação** local" (não "zero nativo"); Node alvo LTS, `bcryptjs` para não somar nativo. (Refinado pelo finding 1 atual com o pin de versão.) | §1.2, §2.3, §2.14 |
| A3 | MED | `PUT /fichas/:fichaId/exercicios` reconcilia por `id`, preservando `completions`. | §2.5, §2.7, §2.11 |
| A4 | MED | Autorização explícita de `/progresso`: aluno só vê o próprio `id`; `fichaId` pertence ao `:id`. | §2.7 |
| A5 | MED | Ficha ativa única: índice único parcial `uq_ficha_ativa` + desativação transacional. | §2.5, §2.7, §1.7 |
| A6 | MED | Enforcement lê o registro do banco; `change-password` reemite token; sem loop de 409. | §2.6, §2.7 |
| A7 | MED | `DELETE /completions` espelha o POST e é idempotente. | §2.7, §2.10, §2.11 |
| A8 | MED | Máquina de estados `pendente→aprovado|rejeitado`; demais → `409 ESTADO_INVALIDO`; reabertura fora de escopo. | §2.7, §1.6 |
| A9 | NIT | `404 NAO_ENCONTRADO` padronizado p/ acesso a dados de terceiros (fichas e progresso). | §2.7, §2.10 |
| A10 | NIT | Resolução de `credencial`: `WHERE matricula = ? OR login = ?`; colisão → `401`. | §2.6, §2.11 |
| A11 | NIT | `GET /alunos/:id/fichas` inclui `seriesConcluidas` por exercício. | §2.7, §2.9 |
| A12 | NIT | Código dedicado `400 NOVA_SENHA_IGUAL`. | §2.7, §2.10, §2.11 |
| A13 | NIT | Seed marca 2 de 4 séries do primeiro exercício como concluídas. | §2.8 item 6 |
