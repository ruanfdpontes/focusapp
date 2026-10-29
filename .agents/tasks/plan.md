# Plano de Implementação — Focus MVP

Fonte de verdade: `.agents/tasks/design.md` (design aprovado, revisão 3) e `.agents/tasks/design-review.json`. Este plano é fiel ao design; não redecide a arquitetura. Incorpora os 3 fixes restantes do `design-review.json` (titulo da ficha, array `exercicios`, shape de `user`).

Raiz do monorepo: `c:\Users\INEX\source\repos\personal\focus`. Ambiente de dev: Windows, PowerShell, Node v24.19.0 (runtime alvo LTS 20/22 via `.nvmrc`). Projeto greenfield: só existe `.agents/`.

Comandos reais do projeto (documentados no README):
- Servidor: `cd server && npm install && npm run start` → cria/semeia `focus.db`, escuta em `:3000`.
- Testes backend: `cd server && npm test` (`node --test` + `supertest`).
- App web: `cd app && npm install && npx expo start --web`.
- App celular: `EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN>:3000` + `npx expo start` (Expo Go).

Regra de DB em verificação: o `focus.db` de dev (semeado) fica intacto. Testes usam SQLite em memória (`better-sqlite3(':memory:')`) ou arquivo temporário descartável via `DB_PATH`.

---

## Bloco A — Fundação do backend

- [ ] 1. Criar o scaffolding do monorepo e o `package.json` do servidor com deps PINADAS.
      Raiz: `README.md` (placeholder inicial), `.gitignore` (ignora `node_modules/`, `server/data/*.db*`, `.env`), `.nvmrc` (`22`). Server: `server/package.json` com `"engines": { "node": ">=20 <23" }`, `"type": "commonjs"`, scripts `start` (`node src/index.js`) e `test` (`node --test`), deps `better-sqlite3@^12.2.0`, `express@^4.19.0`, `bcryptjs@^2.4.3`, `jsonwebtoken@^9.0.2`, `cors@^2.8.5`, `dotenv@^16.4.0`, devDep `supertest`. Criar `server/.env.example` (PORT=3000, JWT_SECRET default SOMENTE-DEMO, DB_PATH=./data/focus.db) e `server/data/.gitkeep`.
      Files: `c:\Users\INEX\source\repos\personal\focus\README.md`, `c:\Users\INEX\source\repos\personal\focus\.gitignore`, `c:\Users\INEX\source\repos\personal\focus\.nvmrc`, `c:\Users\INEX\source\repos\personal\focus\server\package.json`, `c:\Users\INEX\source\repos\personal\focus\server\.env.example`, `c:\Users\INEX\source\repos\personal\focus\server\data\.gitkeep`
      Verify: `cd server && npm install` conclui sem acionar node-gyp (prebuild de better-sqlite3@12.x). Confirmar `node -e "require('better-sqlite3')"` carrega.

- [ ] 2. Implementar config, db e migrate.
      `server/src/config.js` lê env com defaults (PORT 3000, JWT_SECRET demo, DB_PATH `./data/focus.db`, JWT_EXPIRES `12h`, BCRYPT_COST 10). `server/src/db.js` abre `better-sqlite3`, seta `PRAGMA foreign_keys = ON`, exporta fábrica `openDb(path)` e instância default. `server/src/migrate.js` cria tabelas `users`, `fichas`, `exercicios`, `completions` com `CREATE TABLE IF NOT EXISTS` conforme §2.5 (incl. índice único parcial `uq_ficha_ativa ON fichas(aluno_id) WHERE ativa=1`, `idx_fichas_aluno`, `idx_exercicios_ficha`, UNIQUE em completions). `users.status` DEFAULT `'pendente'`.
      Files: `.../server/src/config.js`, `.../server/src/db.js`, `.../server/src/migrate.js`
      Verify: `cd server && node -e "const {openDb}=require('./src/db'); const d=openDb(':memory:'); require('./src/migrate')(d); console.log(d.prepare('SELECT name FROM sqlite_master WHERE type=\"table\"').all())"` lista as 4 tabelas.

- [ ] 3. Implementar primitivas de auth e erros.
      `server/src/errors.js` classe `AppError { status, codigo, mensagem }`. `server/src/auth/password.js` `hash(senha)`/`verify(senha,hash)` com bcryptjs cost 10. `server/src/auth/tokens.js` `sign({sub,role})` com `expiresIn:'12h'` e `verify(token)`.
      Files: `.../server/src/errors.js`, `.../server/src/auth/password.js`, `.../server/src/auth/tokens.js`, testes `.../server/test/password.test.js`, `.../server/test/tokens.test.js`
      Verify: `cd server && npm test` — testes de round-trip hash/verify e sign/verify (incl. expiração) passam.

- [ ] 4. Implementar seed idempotente e bootstrap.
      `server/src/seed.js` idempotente (checa por `login`/`matricula` antes de inserir): Dono (`dono`/`dono123`, status aprovado, mcp 0), instrutor (`instrutor`/`instrutor123`, mcp 1), aluno aprovado (matrícula `2024001`/`aluno123`), aluno pendente (`2024002`), ficha ativa com 3 exercícios (11 séries) e 2 de 4 séries do 1º exercício concluídas. Senhas hasheadas. `server/src/app.js` monta Express (`express.json()`, cors), exportável. `server/src/index.js` bootstrap: migra, semeia, escuta.
      Files: `.../server/src/seed.js`, `.../server/src/app.js`, `.../server/src/index.js`, teste `.../server/test/seed.test.js`
      Verify: `cd server && npm test` — teste roda seed duas vezes em `:memory:` e confirma exatamente 1 dono e idempotência; e que o 1º exercício tem 2 completions.

## Bloco B — API do backend (rotas, validação, repositórios) + fixes da revisão

- [ ] 5. Implementar repositórios SQL.
      `users.repo.js` (criarSolicitacaoAluno grava `status='pendente'` EXPLÍCITO; criarInstrutor grava `status='aprovado'`, mcp 1; buscarPorCredencial `WHERE matricula=? OR login=?`; aprovar/rejeitar; listar por status/role), `fichas.repo.js` (criar com desativação transacional das demais; atualizar; deletar; listar por aluno com exercícios), `exercicios.repo.js` (reconciliação por `id` em transação — UPDATE/INSERT/DELETE), `completions.repo.js` (INSERT OR IGNORE, DELETE idempotente, progresso derivado).
      Files: `.../server/src/repositories/users.repo.js`, `fichas.repo.js`, `exercicios.repo.js`, `completions.repo.js`, testes em `.../server/test/repositories/`
      Verify: `cd server && npm test` — testes de repo em `:memory:`: solicitação nasce `pendente` (SELECT status), ficha ativa única, reconciliação preserva completions dos mantidos e remove dos excluídos.

- [ ] 6. Implementar validators.js com os fixes MEDIUM/NIT 1 e 2.
      Regras de §2.11 MAIS: `titulo` da ficha — obrigatório no POST, opcional no PUT, string não-vazia após trim, 1–120 chars; ausente/vazio/não-string no POST retorna `400 DADOS_INVALIDOS`, nunca 500. Array `exercicios` — POST obrigatório/array/1–50 itens; PUT obrigatório/array/0–50 itens (vazio = remover todos).
      Files: `.../server/src/validators.js`, teste `.../server/test/validators.test.js`
      Verify: `cd server && npm test` — testes cobrem titulo ausente/vazio/não-string→400, array exercicios fora de 1–50 (POST)/0–50 (PUT)→400.

- [ ] 7. Implementar middleware.
      `authenticate.js` (decodifica JWT só p/ `sub`, RECARREGA user do banco, popula `req.user` fresco; token inválido→`401 TOKEN_INVALIDO`; aluno não-aprovado→`403 CONTA_NAO_APROVADA`), `authorize.js` (checa role→`403 ACESSO_NEGADO`), `requirePasswordChanged.js` (`409 SENHA_DEVE_SER_TROCADA` lendo do banco; isenta change-password/logout/me), `recintoLock.js` (no-op `(req,res,next)=>next()`), `errorHandler.js` (formato `{erro:{codigo,mensagem}}`, 500 genérico, nunca loga senha/hash).
      Files: `.../server/src/middleware/authenticate.js`, `authorize.js`, `requirePasswordChanged.js`, `recintoLock.js`, `errorHandler.js`
      Verify: `cd server && npm test` — coberto pelos testes de integração do passo 8/9.

- [ ] 8. Implementar rotas de auth e contas + fix NIT 3 (shape de user).
      `auth.routes.js`: login (resolução por credencial, estados pendente/rejeitado→403 sem token, `user` inclui `status` — fix 3, igualando o shape de `/auth/me`), change-password (reemite token, `400 NOVA_SENHA_IGUAL`), logout, `/auth/me` (inclui `status`, isenta de requirePasswordChanged). `accounts.routes.js`: criar solicitação, listar (dono), approve/reject (máquina de estados, `409 ESTADO_INVALIDO`).
      Files: `.../server/src/routes/auth.routes.js`, `.../server/src/routes/accounts.routes.js`, montagem em `app.js`
      Verify: `cd server && npm test` — integração supertest: CAs 2–6, 8–10; e que `/auth/login` e `/auth/me` retornam `user` com os mesmos campos (incl. `status`).

- [ ] 9. Implementar rotas de instrutores, alunos, fichas e completions.
      `instrutores.routes.js` (criar com mcp, listar). `alunos.routes.js` (listar com filtro por role — instrutor força `aprovado`; dono livre; `:id` deve ser role aluno senão 404). `fichas.routes.js` (POST ficha com validação de titulo+exercicios e `409 ALUNO_NAO_APROVADO`/`404 ALUNO_NAO_ENCONTRADO`; PUT ficha; PUT exercícios reconcilia; DELETE; completions POST/DELETE idempotentes; progresso com `percentual` determinístico).
      Files: `.../server/src/routes/instrutores.routes.js`, `alunos.routes.js`, `fichas.routes.js`, montagem em `app.js`, testes integração `.../server/test/integration/`
      Verify: `cd server && npm test` — CAs 7, 11–13, 17–21 passam, incl. `percentual===18` no seed e titulo ausente→400 (não 500).

## Bloco C — Cliente Expo (pt-BR) + README

- [ ] 10. Scaffolding do app Expo e camada de config/API.
      `app/package.json`, `app/app.json`, `app/app.config.js` (injeta `extra.apiBaseUrl` de `EXPO_PUBLIC_API_BASE_URL`, default `http://localhost:3000`). `app/src/config.ts` (exporta `API_BASE_URL`), `app/src/storage.ts` (secure-store/localStorage), `app/src/api/client.ts` (fetch + token + base URL), `app/src/api/erros.ts` (mapa codigo→mensagem pt-BR).
      Files: `.../app/package.json`, `app.json`, `app.config.js`, `.../app/src/config.ts`, `storage.ts`, `.../app/src/api/client.ts`, `erros.ts`
      Verify: `cd app && npm install` conclui; `npx tsc --noEmit` (se tsconfig) sem erros nos módulos puros.

- [ ] 11. Implementar AuthContext e guard de rota único.
      `app/src/auth/AuthContext.tsx` (reidrata via `/auth/me`, persiste token). `app/src/app/_layout.tsx` (provê Auth + React Query; ÚNICO guard: reidratando→spinner; sem sessão→login; `mustChangePassword`→trocar-senha; senão por role). `index.tsx` só spinner.
      Files: `.../app/src/auth/AuthContext.tsx`, `.../app/src/app/_layout.tsx`, `index.tsx`
      Verify: `cd app && npx tsc --noEmit` sem erros; `npx expo start --web` carrega a tela de login.

- [ ] 12. Implementar telas por papel em pt-BR.
      Comuns: `login.tsx`, `solicitar-conta.tsx`, `trocar-senha.tsx`. Aluno: `(aluno)/treino.tsx`, `progresso.tsx`. Instrutor: `(instrutor)/alunos.tsx`, `ficha/[alunoId].tsx`. Dono: `(dono)/solicitacoes.tsx`, `instrutores.tsx`, `visao-geral.tsx`. Toda UI/mensagem em pt-BR.
      Files: `.../app/src/app/login.tsx`, `solicitar-conta.tsx`, `trocar-senha.tsx`, `(aluno)/treino.tsx`, `(aluno)/progresso.tsx`, `(instrutor)/alunos.tsx`, `(instrutor)/ficha/[alunoId].tsx`, `(dono)/solicitacoes.tsx`, `(dono)/instrutores.tsx`, `(dono)/visao-geral.tsx`
      Verify: `cd app && npx tsc --noEmit` sem erros; walkthrough manual web: login dono→solicitações, login aluno→treino com checkboxes.

- [ ] 13. Finalizar README e verificação end-to-end dos fluxos de conta.
      README em pt-BR: instalar/rodar (server e app), credenciais semeadas, walkthrough dos fluxos, aviso SOMENTE-DEMO de JWT_SECRET/senhas, contingência de prebuild (plano B node:sqlite), next steps (trava de recinto).
      Files: `c:\Users\INEX\source\repos\personal\focus\README.md`
      Verify: start do server com `DB_PATH` temporário descartável; `POST /auth/login` dono→200; fluxo solicitação→aprovação→login aluno; criação de instrutor→1º login mcp→troca→acesso. `focus.db` de dev permanece intacto. `cd server && npm test` tudo verde.
