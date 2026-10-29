'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

const { openDb } = require('../src/db');
const migrate = require('../src/migrate');
const seed = require('../src/seed');

function freshDb() {
  const db = openDb(':memory:');
  migrate(db);
  return db;
}

test('seed é idempotente: rodar duas vezes mantém exatamente 1 dono', () => {
  const db = freshDb();
  seed(db);
  seed(db);

  const donos = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'dono'").get();
  assert.strictEqual(donos.n, 1);
});

test('seed cria 2 completions no primeiro exercício (Supino reto)', () => {
  const db = freshDb();
  seed(db);
  seed(db);

  const supino = db.prepare("SELECT id FROM exercicios WHERE nome = 'Supino reto'").get();
  assert.ok(supino, 'exercício Supino reto deve existir');

  const comps = db
    .prepare('SELECT COUNT(*) AS n FROM completions WHERE exercicio_id = ?')
    .get(supino.id);
  assert.strictEqual(comps.n, 2);
});

test('seed: aluno 2024002 nasce pendente; aluno 2024001 aprovado', () => {
  const db = freshDb();
  seed(db);

  const pendente = db.prepare("SELECT status FROM users WHERE matricula = '2024002'").get();
  const aprovado = db.prepare("SELECT status FROM users WHERE matricula = '2024001'").get();
  assert.strictEqual(pendente.status, 'pendente');
  assert.strictEqual(aprovado.status, 'aprovado');
});

test('seed: ficha tem 11 séries no total e percentual determinístico = 18', () => {
  const db = freshDb();
  seed(db);

  const totalSeries = db
    .prepare(
      `SELECT SUM(e.series) AS total FROM exercicios e
       JOIN fichas f ON f.id = e.ficha_id WHERE f.ativa = 1`
    )
    .get();
  assert.strictEqual(totalSeries.total, 11);

  const totalConcluidas = db.prepare('SELECT COUNT(*) AS n FROM completions').get();
  assert.strictEqual(totalConcluidas.n, 2);

  const percentual = Math.round((100 * totalConcluidas.n) / totalSeries.total);
  assert.strictEqual(percentual, 18);
});
