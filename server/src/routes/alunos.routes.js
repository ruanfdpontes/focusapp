'use strict';

const express = require('express');

const { AppError } = require('../errors');
const validators = require('../validators');
const usersRepoFactory = require('../repositories/users.repo');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const requirePasswordChanged = require('../middleware/requirePasswordChanged');
const recintoLock = require('../middleware/recintoLock');

function alunosRoutes(db) {
  const router = express.Router();
  const usersRepo = usersRepoFactory(db);

  const donoOuInstrutor = [
    authenticate,
    recintoLock,
    requirePasswordChanged,
    authorize('dono', 'instrutor'),
  ];

  // GET /alunos — T+(dono|instrutor). Instrutor força status='aprovado' (FIX design-review/finding 3).
  router.get('/', ...donoOuInstrutor, (req, res, next) => {
    try {
      let status;
      if (req.user.role === 'instrutor') {
        status = 'aprovado'; // ignora qualquer ?status
      } else {
        status = validators.validarStatusQuery(req.query.status); // dono: null = todos
      }
      res.status(200).json({ alunos: usersRepo.listarAlunos(status) });
    } catch (err) {
      next(err);
    }
  });

  // GET /alunos/:id — 404 se inexistente ou não é role='aluno'.
  router.get('/:id', ...donoOuInstrutor, (req, res, next) => {
    try {
      const id = validators.validarIdRota(req.params.id, 'id');
      const aluno = usersRepo.buscarAlunoPorId(id);
      if (!aluno) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Aluno não encontrado.');
      }
      res.status(200).json({ aluno });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = alunosRoutes;
