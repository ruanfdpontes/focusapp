'use strict';

const express = require('express');

const password = require('../auth/password');
const validators = require('../validators');
const usersRepoFactory = require('../repositories/users.repo');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const requirePasswordChanged = require('../middleware/requirePasswordChanged');
const recintoLock = require('../middleware/recintoLock');

function accountsRoutes(db) {
  const router = express.Router();
  const usersRepo = usersRepoFactory(db);

  // POST /accounts/requests — público (aluno cria a própria solicitação).
  router.post('/requests', (req, res, next) => {
    try {
      const { matricula, nome, senha } = validators.validarSolicitacaoConta(req.body);
      const criado = usersRepo.criarSolicitacaoAluno({
        matricula,
        nome,
        senhaHash: password.hash(senha),
      });
      res.status(201).json(criado);
    } catch (err) {
      next(err);
    }
  });

  // Guard das rotas de dono.
  const dono = [authenticate, recintoLock, requirePasswordChanged, authorize('dono')];

  // GET /accounts/requests?status=pendente — T+dono.
  router.get('/requests', ...dono, (req, res, next) => {
    try {
      const status = validators.validarStatusQuery(req.query.status) || 'pendente';
      const requests = usersRepo.listarSolicitacoes(status);
      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  });

  // POST /accounts/requests/:id/approve — T+dono.
  router.post('/requests/:id/approve', ...dono, (req, res, next) => {
    try {
      const id = validators.validarIdRota(req.params.id, 'id');
      const result = usersRepo.aprovarSolicitacao(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /accounts/requests/:id/reject — T+dono.
  router.post('/requests/:id/reject', ...dono, (req, res, next) => {
    try {
      const id = validators.validarIdRota(req.params.id, 'id');
      const result = usersRepo.rejeitarSolicitacao(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = accountsRoutes;
