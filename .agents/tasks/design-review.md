# Design Review — Focus MVP (revisão 3)

Reviewer: design-review subagent (fresh read, sem o contexto que produziu o documento).
Documento revisado: `.agents/tasks/design.md` (auto-identificado como "revisão 3").
Escopo da revisão: ambiguidade, suposições não verificadas, detalhes faltantes, viabilidade, scope creep, conflitos entre seções, tratamento de erro e validação de entrada, contra as regras de negócio obrigatórias (a)–(h) do prompt do passo.

## Veredito

CHANGES_REQUESTED — 1 MEDIUM, 2 NIT (contagem mecânica: HIGH+MEDIUM > 0).

A contagem é mecânica: 1 MEDIUM é suficiente para CHANGES_REQUESTED. Nenhum finding foi rebaixado para NIT para evitar bloquear. Nota de contexto: os 9 findings da revisão anterior foram verificados como genuinamente resolvidos, e as afirmações factuais sobre o npm foram confirmadas verdadeiras (ver "Verified Assumptions"). O único bloqueio restante é um buraco de validação de entrada que escapou às revisões anteriores.

## Cobertura das regras de negócio obrigatórias (a)–(h)

- (a) Auto-cadastro de aluno por matrícula+nome+senha, `pendente` até aprovação, sem login antes de aprovar — COBERTO concretamente: `POST /accounts/requests` grava `status='pendente'` explicitamente (§2.7), login bloqueia `pendente`/`rejeitado` com `403 CONTA_PENDENTE`/`CONTA_REJEITADA` (§2.6), CA #3/#4/#5/#6.
- (b) Instrutor criado pelo Dono com senha padrão, troca forçada no 1º login via `mustChangePassword` — COBERTO: `POST /instrutores` → `mustChangePassword:true` (§2.7); enforcement por `requirePasswordChanged` lendo do banco (§2.6); `POST /auth/change-password` reemite token (§2.7); CA #7/#8/#9.
- (c) Exatamente um Dono semeado com credenciais documentadas — COBERTO: `seed.js` idempotente por `role='dono'`, credenciais `dono`/`dono123` no README (§2.8), RF-16, CA #2.
- (d) Senhas hasheadas, auth por token — COBERTO: `bcryptjs` cost 10, JWT `Bearer` (§2.6), RF-03/RF-04.
- (e) Modelo de dados cobre contas/fichas/exercícios/conclusão — COBERTO: tabelas `users`/`fichas`/`exercicios`/`completions` com schema concreto (§2.5).
- (f) API base URL configurável para LAN — COBERTO: `EXPO_PUBLIC_API_BASE_URL` + `expo.extra.apiBaseUrl`, default `localhost` (§2.4), RF-18, CA #14.
- (g) Sem trava de recinto agora, costura limpa para depois — COBERTO: `middleware/recintoLock.js` no-op montado na cadeia (§2.12), RNF-05, CA #16.
- (h) Tudo em pt-BR — COBERTO: RF/§2.9/§2.10 mapa de mensagens via `api/erros.ts`, CA #15.

Endpoints, schema e mapa de telas estão todos presentes e concretos. O design é, no geral, de alta qualidade e implementável. Os pontos abaixo são o que impede a aprovação direta.

## Findings

### 1. [MEDIUM] `titulo` da ficha é obrigatório e NOT NULL, mas não tem regra de validação em §2.11

Onde: §2.5 (tabela `fichas`, `titulo TEXT NOT NULL`), §2.7 (`POST /alunos/:id/fichas` request `{ titulo, ... }`, `PUT /fichas/:fichaId` `{ titulo? }`), §2.11 (tabela de validação).

Problema: a tabela de validação de §2.11 lista `nome`, `matricula`, senhas, `login` e todos os campos de `exercicios[]`, mas **não tem nenhuma linha para `titulo`**. O schema marca `titulo` como `NOT NULL` e a rota o declara obrigatório no corpo. Como a validação de rota não cobre `titulo`, um `POST /alunos/:id/fichas` com `titulo` ausente, vazio ou não-string passa pelo `validators.js` e só falha na constraint `NOT NULL` do SQLite. Por §2.10 ("Qualquer → erro SQLite/inesperado → `500 ERRO_INTERNO`"), isso vira um **500 genérico** em vez do `400 DADOS_INVALIDOS` prometido para entradas inválidas. É um buraco de validação de entrada sobre o fluxo principal do instrutor (RF-11/RF-12).

Fix concreto: adicionar uma linha em §2.11:

```
| `titulo` (ficha) | obrigatório no POST, opcional no PUT; string não vazia após trim; 1–120 chars. |
```

e garantir que `validators.js` rejeite `titulo` ausente/vazio com `400 DADOS_INVALIDOS` antes do repositório. Opcionalmente adicionar um CA: "POST /alunos/:id/fichas sem titulo retorna 400 DADOS_INVALIDOS (não 500)".

### 2. [NIT] A presença/tamanho do array `exercicios` não tem regra de validação

Onde: §2.7 (`POST /alunos/:id/fichas` `exercicios:[...]`, `PUT /fichas/:fichaId/exercicios` `exercicios:[...]`), §2.11.

Problema: §2.11 valida os campos de cada item (`exercicios[].nome`, `.series`, etc.), mas não diz nada sobre o **array em si**: pode ser omitido? Vazio? Precisa ser um array? Há um limite superior de itens? Ambíguo se `POST /alunos/:id/fichas` com `exercicios` ausente ou `exercicios: []` é `400` ou cria uma ficha sem exercícios. A semântica de "ficha sem exercícios" também afeta o cálculo de `percentual` (§2.7 já trata `totalSeries===0 → 0`, o que sugere que ficha vazia é permitida, mas isso não está dito explicitamente para o POST).

Fix concreto: adicionar em §2.11:

```
| `exercicios` (POST ficha) | obrigatório; array; 1–50 itens (ficha nasce com ao menos 1 exercício). |
| `exercicios` (PUT exercicios) | obrigatório; array; 0–50 itens (vazio = remover todos, permitido). |
```

Ajustar conforme a decisão de produto (permitir ou não ficha vazia); o ponto é tornar a regra explícita, não deixá-la ao acaso do repositório.

### 3. [NIT] Shape do objeto `user` diverge entre `/auth/login` e `/auth/me`

Onde: §2.7 (`/auth/login` → `user:{ id, nome, role, mustChangePassword }`; `/auth/me` → `user:{ id, nome, role, mustChangePassword, status }`).

Problema: `/auth/login` retorna `user` sem `status`, enquanto `/auth/me` inclui `status`. A reidratação (§2.9) depende de `/auth/me` para `status`, então o fluxo funciona; mas o `AuthContext` recebe um `user` de shape diferente conforme a origem (login imediato vs. reidratação), o que convida a bugs no cliente (ex.: ler `user.status` logo após o login e achar `undefined`). Não é um bug de corretude do servidor, por isso NIT.

Fix concreto: padronizar o `user` retornado por `/auth/login` para incluir `status` (o aluno aprovado que acabou de logar tem `status='aprovado'`), de modo que login e `/auth/me` devolvam o mesmo shape. Alternativamente, documentar explicitamente em §2.9 que o cliente trata `status` como presente só após `/auth/me` e nunca o lê da resposta de login.

## Verified Assumptions

Verificado de fato, não aceito pela palavra do documento:

1. `better-sqlite3@13.0.3` (default/`latest`) declara `engines { node: '>=22' }` e **não** tem `scripts.install` — CONFIRMADO via `npm view better-sqlite3@13.0.3 engines scripts.install` (retornou `{ node: '>=22' }` e install vazio). A afirmação de §2.3/finding 1 procede.
2. `better-sqlite3@12.2.0` declara `engines { node: '20.x || 22.x || 23.x || 24.x' }` e `scripts.install = 'prebuild-install || node-gyp rebuild --release'` — CONFIRMADO via `npm view`. O pin em `^12.2.0` é a escolha correta para manter suporte a Node 20 e o fluxo de prebuild, como o design afirma.
3. `latest` de `better-sqlite3` é hoje `13.0.3` — CONFIRMADO (`npm view better-sqlite3 version`). Logo, sem o pin, `npm install` pegaria a 13.x; o pin `^12.2.0` é necessário e, por SemVer, não sobe para 13.x.
4. `require('node:sqlite')` carrega neste ambiente (Node v24.19.0) — CONFIRMADO (impressão "node:sqlite OK"). O plano B de contingência é viável neste runtime (embora experimental, como o design já ressalva).
5. `Math.round(100 * 2 / 11) === 18` — CONFIRMADO executando o cálculo. O seed (2 de 11 séries) e CA #21 são determinísticos e corretos.
6. Node do ambiente de dev é v24.19.0 — CONFIRMADO (`node --version`), consistente com o que o design declara.

## Unverified / Wrong Assumptions

1. NÃO VERIFICÁVEL (e o design é honesto sobre isso): o **download** do binário prebuilt de `better-sqlite3@12.x` para a tripla `win32-x64` + Node LTS 20/22 na máquina alvo da academia. Só os metadados do pacote foram confirmados aqui, não o artefato binário em rede. O design documenta essa contingência (plano B `node:sqlite`, requer Node 22+) e o README deve instruir a validar na máquina alvo. Nenhuma ação de review necessária além de manter a contingência documentada.
2. NÃO VERIFICADO neste review: a afirmação de §2.7/finding 6 de que `express.json()` parseia corpo de `DELETE` e que `fetch` nativo (web + React Native) envia corpo em DELETE na LAN sem proxy descartá-lo. É plausível e o design assume o risco conscientemente para um cenário LAN sem proxies; não foi executado um teste HTTP real aqui. Não bloqueia, mas vale um teste de integração confirmando que `DELETE /completions` com corpo JSON funciona no cliente Expo real.
3. Nenhuma afirmação do design foi encontrada como **factualmente errada**. As afirmações sobre o registro npm (o núcleo do finding 1 da revisão anterior) estão corretas.

## Resolução dos 9 findings da revisão anterior (confirmação independente)

Confirmado que todos foram endereçados no texto, não apenas prometidos:

- Finding 1 (HIGH, pin better-sqlite3): resolvido em §2.3 com `^12.2.0` + demais deps pinadas; metadados npm verificados verdadeiros.
- Finding 2 (HIGH, default de status): resolvido — default invertido para `'pendente'` em §2.5 e INSERT explícito em §2.7, com CA #3 verificando persistência.
- Finding 3 (MED, filtro de alunos do instrutor): resolvido — instrutor força `status='aprovado'`, `409 ALUNO_NAO_APROVADO` no POST de ficha (§2.7, CA #18/#19).
- Finding 4 (MED, escopo de `:id`): resolvido — `404` se `:id` não é `role='aluno'` para qualquer role (§2.7, CA #19/#20).
- Finding 5 (MED, redirect por flag): resolvido — `_layout.tsx` redireciona por `mustChangePassword` independente de role (§2.9).
- Finding 6 (NIT, corpo de DELETE): resolvido/documentado (§2.7).
- Finding 7 (NIT, fronteira de roteamento): resolvido — `_layout.tsx` único guard, `index.tsx` só spinner (§2.9).
- Finding 8 (NIT, credenciais somente-demo): resolvido (§2.6/§2.14).
- Finding 9 (NIT, arredondamento de percentual): resolvido — `Math.round`, 2/11 = 18, determinístico (§2.7/§2.8/CA #21).

Os findings desta rodada (1–3 acima) são **novos**, não regressões dos anteriores.
