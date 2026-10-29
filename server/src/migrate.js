'use strict';

/**
 * Cria o schema SQLite do Focus (§2.5) de forma idempotente (CREATE ... IF NOT EXISTS).
 * Deve ser chamado com uma conexão já aberta (foreign_keys = ON setado em db.openDb).
 *
 * @param {import('better-sqlite3').Database} db
 */
function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK (role IN ('aluno', 'instrutor', 'dono')),
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE,
      login TEXT UNIQUE,
      senha_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fichas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      instrutor_id INTEGER NOT NULL REFERENCES users(id),
      titulo TEXT NOT NULL,
      ativa INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercicios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ficha_id INTEGER NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      series INTEGER NOT NULL CHECK (series >= 1),
      repeticoes TEXT NOT NULL,
      carga TEXT,
      observacoes TEXT,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercicio_id INTEGER NOT NULL REFERENCES exercicios(id) ON DELETE CASCADE,
      aluno_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      serie_numero INTEGER NOT NULL CHECK (serie_numero >= 1),
      concluido_em TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (exercicio_id, aluno_id, serie_numero)
    );

    CREATE INDEX IF NOT EXISTS idx_fichas_aluno ON fichas (aluno_id, ativa);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_ficha_ativa ON fichas (aluno_id) WHERE ativa = 1;
    CREATE INDEX IF NOT EXISTS idx_exercicios_ficha ON exercicios (ficha_id, ordem);
  `);
}

module.exports = migrate;
