'use strict';

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const accountsRoutes = require('./routes/accounts.routes');
const instrutoresRoutes = require('./routes/instrutores.routes');
const alunosRoutes = require('./routes/alunos.routes');
const fichasRoutes = require('./routes/fichas.routes');
const errorHandler = require('./middleware/errorHandler');

/**
 * Monta e retorna o app Express com todas as rotas de negócio (§2.7) e o
 * errorHandler central (§2.10) por último.
 *
 * @param {import('better-sqlite3').Database} db conexão migrada e semeada.
 * @returns {import('express').Express}
 */
function createApp(db) {
  const app = express();

  // CORS aberto (qualquer origem) é permissivo de propósito, aceitável SOMENTE
  // para a demo MVP; endurecer antes de uso real.
  app.use(cors());
  app.use(express.json());

  // Disponibiliza a conexão para rotas e middlewares.
  app.locals.db = db;

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/auth', authRoutes(db));
  app.use('/accounts', accountsRoutes(db));
  app.use('/instrutores', instrutoresRoutes(db));
  app.use('/alunos', alunosRoutes(db));
  // fichas.routes define caminhos absolutos (/alunos/:id/fichas, /fichas/:fichaId,
  // /completions, /alunos/:id/fichas/:fichaId/progresso).
  app.use('/', fichasRoutes(db));

  // Middleware de erro central — sempre por último.
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
