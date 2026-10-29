'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { openDb } = require('../src/db');
const migrate = require('../src/migrate');
const usersRepoFactory = require('../src/repositories/users.repo');
const fichasRepoFactory = require('../src/repositories/fichas.repo');
const completionsRepoFactory = require('../src/repositories/completions.repo');
const { AppError } = require('../src/errors');

function freshDb() {
  const db = openDb(':memory:');
  migrate(db);
  return db;
}

function criarAlunoAprovado(db, matricula = '1001') {
  const info = db
    .prepare(
      `INSERT INTO users (role, nome, matricula, senha_hash, status, must_change_password)
       VALUES ('aluno', 'Aluno', ?, 'x', 'aprovado', 0)`
    )
    .run(matricula);
  return Number(info.lastInsertRowid);
}

function criarInstrutor(db) {
  const info = db
    .prepare(
      `INSERT INTO users (role, nome, login, senha_hash, status, must_change_password)
       VALUES ('instrutor', 'Instrutor', 'inst', 'x', 'aprovado', 0)`
    )
    .run();
  return Number(info.lastInsertRowid);
}

test('users.repo: criarSolicitacaoAluno grava status=pendente explicitamente', () => {
  const db = freshDb();
  const repo = usersRepoFactory(db);
  const { id } = repo.criarSolicitacaoAluno({ matricula: '2024999', nome: 'Novo', senhaHash: 'h' });
  const row = db.prepare('SELECT status FROM users WHERE id = ?').get(id);
  assert.strictEqual(row.status, 'pendente');
});

test('users.repo: matricula duplicada -> AppError 409 MATRICULA_EM_USO', () => {
  const db = freshDb();
  const repo = usersRepoFactory(db);
  repo.criarSolicitacaoAluno({ matricula: 'dup', nome: 'A', senhaHash: 'h' });
  assert.throws(
    () => repo.criarSolicitacaoAluno({ matricula: 'dup', nome: 'B', senhaHash: 'h' }),
    (err) => err instanceof AppError && err.status === 409 && err.codigo === 'MATRICULA_EM_USO'
  );
});

test('users.repo: approve só de pendente; repetir -> 409 ESTADO_INVALIDO', () => {
  const db = freshDb();
  const repo = usersRepoFactory(db);
  const { id } = repo.criarSolicitacaoAluno({ matricula: 'm1', nome: 'A', senhaHash: 'h' });
  const r = repo.aprovarSolicitacao(id);
  assert.strictEqual(r.status, 'aprovado');
  assert.throws(
    () => repo.aprovarSolicitacao(id),
    (err) => err instanceof AppError && err.status === 409 && err.codigo === 'ESTADO_INVALIDO'
  );
});

test('fichas.repo: criar ficha desativa as demais do aluno (ativa única)', () => {
  const db = freshDb();
  const fichasRepo = fichasRepoFactory(db);
  const alunoId = criarAlunoAprovado(db);
  const instrutorId = criarInstrutor(db);

  fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'Ficha 1',
    exercicios: [{ nome: 'A', series: 3, repeticoes: '10' }],
  });
  fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'Ficha 2',
    exercicios: [{ nome: 'B', series: 3, repeticoes: '10' }],
  });

  const ativas = db
    .prepare('SELECT COUNT(*) AS n FROM fichas WHERE aluno_id = ? AND ativa = 1')
    .get(alunoId);
  assert.strictEqual(ativas.n, 1);
  const total = db.prepare('SELECT COUNT(*) AS n FROM fichas WHERE aluno_id = ?').get(alunoId);
  assert.strictEqual(total.n, 2);
});

test('exercicios.repo: reconciliação preserva completions dos mantidos e remove dos excluídos', () => {
  const db = freshDb();
  const fichasRepo = fichasRepoFactory(db);
  const completionsRepo = completionsRepoFactory(db);
  const alunoId = criarAlunoAprovado(db);
  const instrutorId = criarInstrutor(db);

  const ficha = fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'Ficha',
    exercicios: [
      { nome: 'Manter', series: 4, repeticoes: '10' },
      { nome: 'Excluir', series: 3, repeticoes: '12' },
    ],
  });

  const manter = ficha.exercicios.find((e) => e.nome === 'Manter');
  const excluir = ficha.exercicios.find((e) => e.nome === 'Excluir');

  completionsRepo.marcar(manter.id, alunoId, 1);
  completionsRepo.marcar(manter.id, alunoId, 2);
  completionsRepo.marcar(excluir.id, alunoId, 1);

  // Reconcilia: mantém 'Manter' (com id), remove 'Excluir' (ausente), adiciona 'Novo'.
  fichasRepo.reconciliarExercicios(ficha.id, [
    { id: manter.id, nome: 'Manter', series: 4, repeticoes: '10' },
    { nome: 'Novo', series: 2, repeticoes: '8' },
  ]);

  // Completions do mantido preservadas.
  assert.deepStrictEqual(completionsRepo.seriesConcluidas(manter.id, alunoId), [1, 2]);
  // Completions do excluído removidas (cascade).
  const compsExcluido = db
    .prepare('SELECT COUNT(*) AS n FROM completions WHERE exercicio_id = ?')
    .get(excluir.id);
  assert.strictEqual(compsExcluido.n, 0);
  // Exercício excluído sumiu, novo existe.
  const nomes = db
    .prepare('SELECT nome FROM exercicios WHERE ficha_id = ? ORDER BY ordem, id')
    .all(ficha.id)
    .map((r) => r.nome);
  assert.deepStrictEqual(nomes, ['Manter', 'Novo']);
});

test('exercicios.repo: id de outra ficha na reconciliação -> AppError 400', () => {
  const db = freshDb();
  const fichasRepo = fichasRepoFactory(db);
  const alunoId = criarAlunoAprovado(db);
  const instrutorId = criarInstrutor(db);

  const fichaA = fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'A',
    ativa: false,
    exercicios: [{ nome: 'ExA', series: 3, repeticoes: '10' }],
  });
  const fichaB = fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'B',
    exercicios: [{ nome: 'ExB', series: 3, repeticoes: '10' }],
  });
  const idDeA = fichaA.exercicios[0].id;

  assert.throws(
    () =>
      fichasRepo.reconciliarExercicios(fichaB.id, [
        { id: idDeA, nome: 'ExA', series: 3, repeticoes: '10' },
      ]),
    (err) => err instanceof AppError && err.status === 400 && err.codigo === 'DADOS_INVALIDOS'
  );
});

test('completions.repo: progresso derivado determinístico (2 de 11 = 18)', () => {
  const db = freshDb();
  const fichasRepo = fichasRepoFactory(db);
  const completionsRepo = completionsRepoFactory(db);
  const alunoId = criarAlunoAprovado(db);
  const instrutorId = criarInstrutor(db);

  const ficha = fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'Full Body',
    exercicios: [
      { nome: 'Supino', series: 4, repeticoes: '8-12' },
      { nome: 'Agachamento', series: 4, repeticoes: '10' },
      { nome: 'Remada', series: 3, repeticoes: '12' },
    ],
  });
  const supino = ficha.exercicios[0];
  completionsRepo.marcar(supino.id, alunoId, 1);
  completionsRepo.marcar(supino.id, alunoId, 2);

  const progresso = completionsRepo.progressoDaFicha(ficha.id, alunoId);
  assert.strictEqual(progresso.totalSeries, 11);
  assert.strictEqual(progresso.totalConcluidas, 2);
  assert.strictEqual(progresso.percentual, 18);
});

test('completions.repo: desmarcar é idempotente (não lança se nada apagar)', () => {
  const db = freshDb();
  const fichasRepo = fichasRepoFactory(db);
  const completionsRepo = completionsRepoFactory(db);
  const alunoId = criarAlunoAprovado(db);
  const instrutorId = criarInstrutor(db);
  const ficha = fichasRepo.criar({
    alunoId,
    instrutorId,
    titulo: 'F',
    exercicios: [{ nome: 'Ex', series: 2, repeticoes: '10' }],
  });
  const ex = ficha.exercicios[0];
  assert.doesNotThrow(() => completionsRepo.desmarcar(ex.id, alunoId, 1));
});
