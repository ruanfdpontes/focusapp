'use strict';

const express = require('express');
const cors = require('cors');

/**
 * Monta e retorna o app Express. As rotas de negócio são adicionadas em
 * FEAT-002/FEAT-003; por ora expõe apenas /health para smoke test.
 *
 * @param {import('better-sqlite3').Database} db conexão migrada e semeada.
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Disponibiliza a conexão para as rotas/middlewares futuros.
  app.locals.db = db;

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  return app;
}

module.exports = createApp;
