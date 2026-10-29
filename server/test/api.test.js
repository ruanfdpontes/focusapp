'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { openDb } = require('../src/db');
const migrate = require('../src/migrate');
const seed = require('../src/seed');
const createApp = require('../src/app');

/** App isolado: DB em memória, migrado e semeado. Cada teste tem o seu. */
function freshApp() {
  const db = openDb(':memory:');
  migrate(db);
  seed(db);
  return createApp(db);
}

async function login(app, credencial, senha) {
  const res = await request(app).post('/auth/login').send({ credencial, senha });
  return res;
}

async function tokenDe(app, credencial, senha) {
  const res = await login(app, credencial, senha);
  assert.strictEqual(res.status, 200, `login falhou p/ ${credencial}`);
  return res.body.token;
}

// --- CA 2: login do dono ---
test('CA2: POST /auth/login dono retorna 200 com role dono e status', async () => {
  const app = freshApp();
  const res = await login(app, 'dono', 'dono123');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.role, 'dono');
  assert.strictEqual(res.body.user.status, 'aprovado');
});

// --- CA 3: criar solicitação nasce pendente ---
test('CA3: POST /accounts/requests cria aluno pendente (201)', async () => {
  const app = freshApp();
  const res = await request(app)
    .post('/accounts/requests')
    .send({ matricula: '3030', nome: 'Fulano', senha: 'senha123' });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.status, 'pendente');
  assert.ok(res.body.id);
});

test('CA3b: matrícula já usada -> 409 MATRICULA_EM_USO', async () => {
  const app = freshApp();
  const res = await request(app)
    .post('/accounts/requests')
    .send({ matricula: '2024001', nome: 'Xavier', senha: 'senha123' });
  assert.strictEqual(res.status, 409);
  assert.strictEqual(res.body.erro.codigo, 'MATRICULA_EM_USO');
});

// --- CA 4: login aluno pendente -> 403 CONTA_PENDENTE ---
test('CA4: login de aluno pendente -> 403 CONTA_PENDENTE sem token', async () => {
  const app = freshApp();
  const res = await login(app, '2024002', 'aluno123');
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.erro.codigo, 'CONTA_PENDENTE');
  assert.strictEqual(res.body.token, undefined);
});

// --- CA 5: approve e máquina de estados ---
test('CA5: dono aprova solicitação pendente; aluno passa a logar; approve repetido -> 409', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');

  const lista = await request(app)
    .get('/accounts/requests?status=pendente')
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(lista.status, 200);
  const pendente = lista.body.requests.find((r) => r.matricula === '2024002');
  assert.ok(pendente);

  const aprov = await request(app)
    .post(`/accounts/requests/${pendente.id}/approve`)
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(aprov.status, 200);
  assert.strictEqual(aprov.body.status, 'aprovado');

  const loginAluno = await login(app, '2024002', 'aluno123');
  assert.strictEqual(loginAluno.status, 200);

  const repetido = await request(app)
    .post(`/accounts/requests/${pendente.id}/approve`)
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(repetido.status, 409);
  assert.strictEqual(repetido.body.erro.codigo, 'ESTADO_INVALIDO');
});

// --- CA 6: reject -> login rejeitado ---
test('CA6: dono rejeita; login -> 403 CONTA_REJEITADA', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  const lista = await request(app)
    .get('/accounts/requests?status=pendente')
    .set('Authorization', `Bearer ${tokenDono}`);
  const pendente = lista.body.requests.find((r) => r.matricula === '2024002');

  const rej = await request(app)
    .post(`/accounts/requests/${pendente.id}/reject`)
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(rej.status, 200);
  assert.strictEqual(rej.body.status, 'rejeitado');

  const loginAluno = await login(app, '2024002', 'aluno123');
  assert.strictEqual(loginAluno.status, 403);
  assert.strictEqual(loginAluno.body.erro.codigo, 'CONTA_REJEITADA');
});

test('CA5c: approve de id inexistente -> 404 NAO_ENCONTRADO', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  const res = await request(app)
    .post('/accounts/requests/99999/approve')
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.erro.codigo, 'NAO_ENCONTRADO');
});

// --- CA 7/8/9: instrutor mustChangePassword flow ---
test('CA7/8/9: dono cria instrutor; 1o login mustChangePassword; rota protegida 409; change-password reemite token', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');

  const criar = await request(app)
    .post('/instrutores')
    .set('Authorization', `Bearer ${tokenDono}`)
    .send({ nome: 'Novo Instrutor', login: 'novoinst', senhaPadrao: 'temp123' });
  assert.strictEqual(criar.status, 201);
  assert.strictEqual(criar.body.mustChangePassword, true);

  const loginInst = await login(app, 'novoinst', 'temp123');
  assert.strictEqual(loginInst.status, 200);
  assert.strictEqual(loginInst.body.user.mustChangePassword, true);
  const tokenInst = loginInst.body.token;

  // Rota protegida (exceto change-password/logout/me) -> 409 SENHA_DEVE_SER_TROCADA.
  const protegida = await request(app)
    .get('/alunos')
    .set('Authorization', `Bearer ${tokenInst}`);
  assert.strictEqual(protegida.status, 409);
  assert.strictEqual(protegida.body.erro.codigo, 'SENHA_DEVE_SER_TROCADA');

  // change-password reemite token e zera a flag.
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({ senhaAtual: 'temp123', novaSenha: 'definitiva123' });
  assert.strictEqual(troca.status, 200);
  assert.strictEqual(troca.body.ok, true);
  assert.ok(troca.body.token);
  assert.strictEqual(troca.body.user.mustChangePassword, false);

  // Agora acessa a protegida normalmente com o novo token.
  const okAgora = await request(app)
    .get('/alunos')
    .set('Authorization', `Bearer ${troca.body.token}`);
  assert.strictEqual(okAgora.status, 200);
});

test('CA9b: change-password com nova senha igual -> 400 NOVA_SENHA_IGUAL', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const tokenInst = loginInst.body.token;
  const res = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'instrutor123' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.erro.codigo, 'NOVA_SENHA_IGUAL');
});

// --- CA 10: /auth/me acessível sob mustChangePassword ---
test('CA10: GET /auth/me funciona sob mustChangePassword', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const tokenInst = loginInst.body.token;
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenInst}`);
  assert.strictEqual(me.status, 200);
  assert.strictEqual(me.body.user.mustChangePassword, true);
  assert.strictEqual(me.body.user.status, 'aprovado');
});

// --- CA 8b: token ausente -> 401 TOKEN_INVALIDO ---
test('CA8b: rota protegida sem token -> 401 TOKEN_INVALIDO', async () => {
  const app = freshApp();
  const res = await request(app).get('/alunos');
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.erro.codigo, 'TOKEN_INVALIDO');
});

// --- CA 11: fichas, invariante ativa única ---
test('CA11: instrutor cria ficha; aluno-dono vê os mesmos exercícios', async () => {
  const app = freshApp();
  // Instrutor de seed precisa trocar senha primeiro.
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;

  // Descobre o id do aluno aprovado (2024001).
  const listaAlunos = await request(app)
    .get('/alunos')
    .set('Authorization', `Bearer ${tokenInst}`);
  const aluno = listaAlunos.body.alunos.find((a) => a.matricula === '2024001');
  assert.ok(aluno);

  const criar = await request(app)
    .post(`/alunos/${aluno.id}/fichas`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({
      titulo: 'Treino B',
      exercicios: [{ nome: 'Rosca', series: 3, repeticoes: '12', carga: '10kg' }],
    });
  assert.strictEqual(criar.status, 201);

  // Aluno vê as próprias fichas; só uma ativa.
  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const fichas = await request(app)
    .get(`/alunos/${aluno.id}/fichas`)
    .set('Authorization', `Bearer ${tokenAluno}`);
  assert.strictEqual(fichas.status, 200);
  const ativas = fichas.body.fichas.filter((f) => f.ativa);
  assert.strictEqual(ativas.length, 1);
  assert.strictEqual(ativas[0].titulo, 'Treino B');
  assert.ok(ativas[0].exercicios[0].seriesConcluidas !== undefined);
});

// --- CA 12 + 21: completions + progresso ---
test('CA12/21: aluno marca série; progresso reflete; DELETE idempotente; seed = 18', async () => {
  const app = freshApp();
  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');

  // id do aluno via /auth/me.
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const alunoId = me.body.user.id;

  const fichas = await request(app)
    .get(`/alunos/${alunoId}/fichas`)
    .set('Authorization', `Bearer ${tokenAluno}`);
  const ficha = fichas.body.fichas.find((f) => f.ativa);
  const supino = ficha.exercicios.find((e) => e.nome === 'Supino reto');

  // Seed já tem 2 de 11 -> 18.
  const prog0 = await request(app)
    .get(`/alunos/${alunoId}/fichas/${ficha.id}/progresso`)
    .set('Authorization', `Bearer ${tokenAluno}`);
  assert.strictEqual(prog0.status, 200);
  assert.strictEqual(prog0.body.totalSeries, 11);
  assert.strictEqual(prog0.body.percentual, 18);

  // Marca a série 3 do supino.
  const mark = await request(app)
    .post('/completions')
    .set('Authorization', `Bearer ${tokenAluno}`)
    .send({ exercicioId: supino.id, serieNumero: 3 });
  assert.strictEqual(mark.status, 201);

  const prog1 = await request(app)
    .get(`/alunos/${alunoId}/fichas/${ficha.id}/progresso`)
    .set('Authorization', `Bearer ${tokenAluno}`);
  assert.strictEqual(prog1.body.totalConcluidas, 3);

  // DELETE idempotente: apaga e repete.
  const del1 = await request(app)
    .delete('/completions')
    .set('Authorization', `Bearer ${tokenAluno}`)
    .send({ exercicioId: supino.id, serieNumero: 3 });
  assert.strictEqual(del1.status, 200);
  const del2 = await request(app)
    .delete('/completions')
    .set('Authorization', `Bearer ${tokenAluno}`)
    .send({ exercicioId: supino.id, serieNumero: 3 });
  assert.strictEqual(del2.status, 200);
  assert.strictEqual(del2.body.ok, true);
});

test('CA12b: completion com serieNumero fora do intervalo -> 400; exercício de outro -> 404', async () => {
  const app = freshApp();
  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const fichas = await request(app)
    .get(`/alunos/${me.body.user.id}/fichas`)
    .set('Authorization', `Bearer ${tokenAluno}`);
  const supino = fichas.body.fichas
    .find((f) => f.ativa)
    .exercicios.find((e) => e.nome === 'Supino reto');

  const fora = await request(app)
    .post('/completions')
    .set('Authorization', `Bearer ${tokenAluno}`)
    .send({ exercicioId: supino.id, serieNumero: 99 });
  assert.strictEqual(fora.status, 400);
  assert.strictEqual(fora.body.erro.codigo, 'DADOS_INVALIDOS');

  const outro = await request(app)
    .post('/completions')
    .set('Authorization', `Bearer ${tokenAluno}`)
    .send({ exercicioId: 999999, serieNumero: 1 });
  assert.strictEqual(outro.status, 404);
});

// --- CA 13: PUT exercicios preserva completions ---
test('CA13: PUT /fichas/:id/exercicios preserva completions dos mantidos', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;

  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const alunoId = me.body.user.id;

  const fichas = await request(app)
    .get(`/alunos/${alunoId}/fichas`)
    .set('Authorization', `Bearer ${tokenInst}`);
  const ficha = fichas.body.fichas.find((f) => f.ativa);
  const supino = ficha.exercicios.find((e) => e.nome === 'Supino reto');
  const agachamento = ficha.exercicios.find((e) => e.nome === 'Agachamento');

  // Reconcilia: mantém supino (com id), remove agachamento, mantém remada, adiciona novo.
  const remada = ficha.exercicios.find((e) => e.nome === 'Remada curvada');
  const put = await request(app)
    .put(`/fichas/${ficha.id}/exercicios`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({
      exercicios: [
        { id: supino.id, nome: 'Supino reto', series: 4, repeticoes: '8-12' },
        { id: remada.id, nome: 'Remada curvada', series: 3, repeticoes: '12' },
        { nome: 'Novo Ex', series: 2, repeticoes: '15' },
      ],
    });
  assert.strictEqual(put.status, 200);

  // Supino mantém suas 2 séries concluídas.
  const supinoDepois = put.body.ficha.exercicios.find((e) => e.nome === 'Supino reto');
  assert.deepStrictEqual(supinoDepois.seriesConcluidas, [1, 2]);
  // Agachamento removido.
  assert.ok(!put.body.ficha.exercicios.some((e) => e.nome === 'Agachamento'));
  // agachamento usado só para lookup; evita variável não usada.
  assert.ok(agachamento);
});

// --- CA 17/20: aluno não vê dados de terceiros; :id não-aluno -> 404 ---
test('CA17: aluno pedindo fichas de outro aluno -> 404', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  // aprova 2024002 e cria outro aluno distinto.
  const lista = await request(app)
    .get('/accounts/requests?status=pendente')
    .set('Authorization', `Bearer ${tokenDono}`);
  const pendente = lista.body.requests.find((r) => r.matricula === '2024002');
  await request(app)
    .post(`/accounts/requests/${pendente.id}/approve`)
    .set('Authorization', `Bearer ${tokenDono}`);

  const tokenAluno1 = await tokenDe(app, '2024001', 'aluno123');
  const res = await request(app)
    .get(`/alunos/${pendente.id}/fichas`)
    .set('Authorization', `Bearer ${tokenAluno1}`);
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.erro.codigo, 'NAO_ENCONTRADO');
});

test('CA20: GET /alunos/<id_instrutor>/fichas -> 404 (não é aluno)', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  const instrutores = await request(app)
    .get('/instrutores')
    .set('Authorization', `Bearer ${tokenDono}`);
  const instrutorId = instrutores.body.instrutores[0].id;
  const res = await request(app)
    .get(`/alunos/${instrutorId}/fichas`)
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.strictEqual(res.status, 404);
});

// --- CA 18/19: filtro por role; POST ficha 404/409 ---
test('CA18: instrutor GET /alunos?status=pendente ignora query, retorna só aprovados', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;

  const res = await request(app)
    .get('/alunos?status=pendente')
    .set('Authorization', `Bearer ${tokenInst}`);
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.alunos.every((a) => a.status === 'aprovado'));
  assert.ok(res.body.alunos.length >= 1);
});

test('CA18b: dono GET /alunos?status=pendente retorna pendentes; sem query = todos', async () => {
  const app = freshApp();
  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  const pend = await request(app)
    .get('/alunos?status=pendente')
    .set('Authorization', `Bearer ${tokenDono}`);
  assert.ok(pend.body.alunos.every((a) => a.status === 'pendente'));

  const todos = await request(app).get('/alunos').set('Authorization', `Bearer ${tokenDono}`);
  const statuses = new Set(todos.body.alunos.map((a) => a.status));
  assert.ok(statuses.has('aprovado') && statuses.has('pendente'));
});

test('CA19: POST ficha p/ não-aluno -> 404 ALUNO_NAO_ENCONTRADO; p/ aluno pendente -> 409 ALUNO_NAO_APROVADO', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;

  const tokenDono = await tokenDe(app, 'dono', 'dono123');
  const instrutores = await request(app)
    .get('/instrutores')
    .set('Authorization', `Bearer ${tokenDono}`);
  const instrutorId = instrutores.body.instrutores[0].id;

  const corpoFicha = {
    titulo: 'X',
    exercicios: [{ nome: 'A', series: 3, repeticoes: '10' }],
  };

  const naoAluno = await request(app)
    .post(`/alunos/${instrutorId}/fichas`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send(corpoFicha);
  assert.strictEqual(naoAluno.status, 404);
  assert.strictEqual(naoAluno.body.erro.codigo, 'ALUNO_NAO_ENCONTRADO');

  // aluno pendente 2024002.
  const pendentes = await request(app)
    .get('/alunos?status=pendente')
    .set('Authorization', `Bearer ${tokenDono}`);
  const pendenteId = pendentes.body.alunos.find((a) => a.matricula === '2024002').id;
  const naoAprovado = await request(app)
    .post(`/alunos/${pendenteId}/fichas`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send(corpoFicha);
  assert.strictEqual(naoAprovado.status, 409);
  assert.strictEqual(naoAprovado.body.erro.codigo, 'ALUNO_NAO_APROVADO');
});

// ===== FIX 1 (MEDIUM): título da ficha validado -> 400, nunca 500 =====
test('FIX1: POST ficha sem titulo / vazio / não-string -> 400 DADOS_INVALIDOS (nunca 500)', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;

  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const alunoId = me.body.user.id;
  const ex = [{ nome: 'A', series: 3, repeticoes: '10' }];

  for (const titulo of [undefined, '', '   ', 123, null]) {
    const res = await request(app)
      .post(`/alunos/${alunoId}/fichas`)
      .set('Authorization', `Bearer ${tokenInst}`)
      .send({ titulo, exercicios: ex });
    assert.strictEqual(res.status, 400, `titulo=${JSON.stringify(titulo)} deveria dar 400`);
    assert.strictEqual(res.body.erro.codigo, 'DADOS_INVALIDOS');
  }
});

// ===== FIX 2 (NIT): array exercicios 1-50 POST / 0-50 PUT =====
test('FIX2: POST ficha com exercicios ausente/não-array/vazio/>50 -> 400', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;
  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const alunoId = me.body.user.id;

  const demais = (ex) =>
    request(app)
      .post(`/alunos/${alunoId}/fichas`)
      .set('Authorization', `Bearer ${tokenInst}`)
      .send({ titulo: 'T', exercicios: ex });

  const umEx = { nome: 'A', series: 3, repeticoes: '10' };
  const grande = Array.from({ length: 51 }, () => ({ ...umEx }));

  for (const ex of [undefined, 'nao-array', [], grande]) {
    const res = await demais(ex);
    assert.strictEqual(res.status, 400, `exercicios inválido deveria dar 400`);
    assert.strictEqual(res.body.erro.codigo, 'DADOS_INVALIDOS');
  }
});

test('FIX2b: PUT exercicios >50 -> 400; [] remove todos', async () => {
  const app = freshApp();
  const loginInst = await login(app, 'instrutor', 'instrutor123');
  const troca = await request(app)
    .post('/auth/change-password')
    .set('Authorization', `Bearer ${loginInst.body.token}`)
    .send({ senhaAtual: 'instrutor123', novaSenha: 'inst-nova-123' });
  const tokenInst = troca.body.token;
  const tokenAluno = await tokenDe(app, '2024001', 'aluno123');
  const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenAluno}`);
  const fichas = await request(app)
    .get(`/alunos/${me.body.user.id}/fichas`)
    .set('Authorization', `Bearer ${tokenInst}`);
  const ficha = fichas.body.fichas.find((f) => f.ativa);

  const umEx = { nome: 'A', series: 3, repeticoes: '10' };
  const grande = Array.from({ length: 51 }, () => ({ ...umEx }));
  const tooBig = await request(app)
    .put(`/fichas/${ficha.id}/exercicios`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({ exercicios: grande });
  assert.strictEqual(tooBig.status, 400);

  const vazio = await request(app)
    .put(`/fichas/${ficha.id}/exercicios`)
    .set('Authorization', `Bearer ${tokenInst}`)
    .send({ exercicios: [] });
  assert.strictEqual(vazio.status, 200);
  assert.strictEqual(vazio.body.ficha.exercicios.length, 0);
});

// ===== FIX 3 (NIT): shape de user igual entre /auth/login e /auth/me =====
test('FIX3: /auth/login e /auth/me retornam user com os MESMOS campos (incl. status)', async () => {
  const app = freshApp();
  const loginRes = await login(app, 'dono', 'dono123');
  const meRes = await request(app)
    .get('/auth/me')
    .set('Authorization', `Bearer ${loginRes.body.token}`);
  assert.strictEqual(meRes.status, 200);

  const camposLogin = Object.keys(loginRes.body.user).sort();
  const camposMe = Object.keys(meRes.body.user).sort();
  assert.deepStrictEqual(camposLogin, camposMe);
  assert.ok(camposLogin.includes('status'));
  assert.strictEqual(loginRes.body.user.status, meRes.body.user.status);
});
