# Focus — App de Gestão de Treinos de Academia (MVP)

> Placeholder. O README completo (instalação, execução, credenciais, walkthrough e próximos passos) é finalizado em FEAT-003.

MVP de gestão de treinos de academia com três perfis — **Aluno**, **Instrutor** e **Dono**. Monorepo com dois pacotes independentes:

- `server/` — backend Node.js/Express + SQLite (API REST).
- `app/` — cliente Expo (React Native + Expo Router), roda em web e mobile.

## Pré-requisito

Node.js LTS **20.x ou 22.x** (o repo traz `.nvmrc` com `22`). Combinado com `better-sqlite3` pinado em `^12.2.0`, isso garante o download do prebuild e evita a necessidade de Build Tools.

## Início rápido (servidor)

```
cd server
npm install
npm run start
```

Cria/semeia `server/data/focus.db` e escuta em `http://localhost:3000`.

Credenciais do Dono semeado: login `dono` / senha `dono123`.

> **Aviso:** o `JWT_SECRET` default e as senhas de seed são **apenas para demonstração** em LAN de testes. Troque-os antes de qualquer uso fora do ambiente de demo.
