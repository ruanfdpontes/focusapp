'use strict';

const express = require('express');

const password = require('../auth/password');
const validators = require('../validators');
const usersRepoFactory = require('../repositories/users.repo');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const requirePasswordChanged = require('../middleware/requirePasswordChanged');
const recintoLock = require('../middleware/recintoLock');

function instrutoresRoutes(db) {
  const router = express.Router();
  const usersRepo = usersRepoFactory(db);

  const dono = [authenticate, recintoLock, requirePasswordChanged, authorize('dono')];

  // POST /instrutores — T+dono.
  router.post('/', ...dono, (req, res, next) => {
    try {
      const { nome, login, senhaPadrao } = validators.validarCriarInstrutor(req.body);
      const criado = usersRepo.criarInstrutor({
        nome,
        login,
        senhaHash: password.hash(senhaPadrao),
      });
      res.status(201).json(criado);
    } catch (err) {
      next(err);
    }
  });

  // GET /instrutores — T+dono.
  router.get('/', ...dono, (req, res, next) => {
    try {
      res.status(200).json({ instrutores: usersRepo.listarInstrutores() });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = instrutoresRoutes;
