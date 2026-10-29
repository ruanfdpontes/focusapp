'use strict';

const Database = require('better-sqlite3');
const config = require('./config');

/**
 * Abre uma conexão better-sqlite3 no caminho informado e habilita as foreign keys.
 * Use ':memory:' para um banco descartável (testes).
 *
 * @param {string} dbPath caminho do arquivo SQLite ou ':memory:'.
 * @returns {import('better-sqlite3').Database}
 */
function openDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  return db;
}

// Instância default a partir de config.DB_PATH, criada sob demanda (lazy) para
// que importar este módulo em testes não crie o arquivo de dev.
let defaultDb = null;

/**
 * Retorna (criando na primeira chamada) a instância default apontando para config.DB_PATH.
 * @returns {import('better-sqlite3').Database}
 */
function getDefaultDb() {
  if (!defaultDb) {
    defaultDb = openDb(config.DB_PATH);
  }
  return defaultDb;
}

module.exports = { openDb, getDefaultDb };
