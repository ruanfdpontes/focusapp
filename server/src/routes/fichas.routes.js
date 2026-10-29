'use strict';

const express = require('express');

const { AppError } = require('../errors');
const validators = require('../validators');
const usersRepoFactory = require('../repositories/users.repo');
const fichasRepoFactory = require('../repositories/fichas.repo');
const completionsRepoFactory = require('../repositories/completions.repo');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const requirePasswordChanged = require('../middleware/requirePasswordChanged');
const recintoLock = require('../middleware/recintoLock');

function fichasRoutes(db) {
  const router = express.Router();
  const usersRepo = usersRepoFactory(db);
  const fichasRepo = fichasRepoFactory(db);
  const completionsRepo = completionsRepoFactory(db);

  const protegido = [authenticate, recintoLock, requirePasswordChanged];
  const instrutor = [...protegido, authorize('instrutor')];
  const aluno = [...protegido, authorize('aluno')];

  /**
   * Garante que :id é um aluno e que o chamador pode vê-lo. Retorna o id numérico
   * do aluno. Lança 404 NAO_ENCONTRADO padronizado (não revela dados de terceiros).
   */
  function resolverAlunoAcessivel(req, codigo = 'NAO_ENCONTRADO') {
    const id = validators.validarIdRota(req.params.id, 'id');
    const aluno = usersRepo.buscarAlunoPorId(id);
    if (!aluno) {
      throw new AppError(404, codigo, 'Aluno não encontrado.');
    }
    if (req.user.role === 'aluno' && req.user.id !== id) {
      throw new AppError(404, 'NAO_ENCONTRADO', 'Recurso não encontrado.');
    }
    return { id, aluno };
  }

  // GET /alunos/:id/fichas — aluno-dono | instrutor | dono.
  router.get(
    '/alunos/:id/fichas',
    ...protegido,
    authorize('aluno', 'instrutor', 'dono'),
    (req, res, next) => {
      try {
        const { id } = resolverAlunoAcessivel(req);
        res.status(200).json({ fichas: fichasRepo.listarPorAluno(id) });
      } catch (err) {
        next(err);
      }
    }
  );

  // POST /alunos/:id/fichas — T+instrutor.
  router.post('/alunos/:id/fichas', ...instrutor, (req, res, next) => {
    try {
      const id = validators.validarIdRota(req.params.id, 'id');
      const aluno = usersRepo.buscarAlunoPorId(id);
      if (!aluno) {
        throw new AppError(404, 'ALUNO_NAO_ENCONTRADO', 'Aluno não encontrado.');
      }
      if (aluno.status !== 'aprovado') {
        throw new AppError(409, 'ALUNO_NAO_APROVADO', 'O aluno não está aprovado.');
      }
      const { titulo, ativa, exercicios } = validators.validarCriarFicha(req.body);
      const ficha = fichasRepo.criar({
        alunoId: id,
        instrutorId: req.user.id,
        titulo,
        ativa,
        exercicios,
      });
      res.status(201).json({ ficha });
    } catch (err) {
      next(err);
    }
  });

  // PUT /fichas/:fichaId — T+instrutor (titulo?/ativa?).
  router.put('/fichas/:fichaId', ...instrutor, (req, res, next) => {
    try {
      const fichaId = validators.validarIdRota(req.params.fichaId, 'fichaId');
      const campos = validators.validarAtualizarFicha(req.body);
      const ficha = fichasRepo.atualizar(fichaId, campos);
      res.status(200).json({ ficha });
    } catch (err) {
      next(err);
    }
  });

  // PUT /fichas/:fichaId/exercicios — T+instrutor (reconcilia por id).
  router.put('/fichas/:fichaId/exercicios', ...instrutor, (req, res, next) => {
    try {
      const fichaId = validators.validarIdRota(req.params.fichaId, 'fichaId');
      const { exercicios } = validators.validarReconciliarExercicios(req.body);
      const ficha = fichasRepo.reconciliarExercicios(fichaId, exercicios);
      res.status(200).json({ ficha });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /fichas/:fichaId — T+instrutor.
  router.delete('/fichas/:fichaId', ...instrutor, (req, res, next) => {
    try {
      const fichaId = validators.validarIdRota(req.params.fichaId, 'fichaId');
      fichasRepo.deletar(fichaId);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // POST /completions — T+aluno.
  router.post('/completions', ...aluno, (req, res, next) => {
    try {
      const { exercicioId, serieNumero } = validators.validarCompletion(req.body);
      const exercicio = completionsRepo.buscarExercicioDoAluno(exercicioId, req.user.id);
      if (!exercicio) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Exercício não encontrado.');
      }
      if (serieNumero > exercicio.series) {
        throw new AppError(400, 'DADOS_INVALIDOS', 'serieNumero fora do intervalo do exercício.');
      }
      completionsRepo.marcar(exercicioId, req.user.id, serieNumero);
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /completions — T+aluno (idempotente).
  router.delete('/completions', ...aluno, (req, res, next) => {
    try {
      const { exercicioId, serieNumero } = validators.validarCompletion(req.body);
      const exercicio = completionsRepo.buscarExercicioDoAluno(exercicioId, req.user.id);
      if (!exercicio) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Exercício não encontrado.');
      }
      if (serieNumero > exercicio.series) {
        throw new AppError(400, 'DADOS_INVALIDOS', 'serieNumero fora do intervalo do exercício.');
      }
      completionsRepo.desmarcar(exercicioId, req.user.id, serieNumero);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // GET /alunos/:id/fichas/:fichaId/progresso — aluno-dono | instrutor | dono.
  router.get(
    '/alunos/:id/fichas/:fichaId/progresso',
    ...protegido,
    authorize('aluno', 'instrutor', 'dono'),
    (req, res, next) => {
      try {
        const { id } = resolverAlunoAcessivel(req);
        const fichaId = validators.validarIdRota(req.params.fichaId, 'fichaId');
        const ficha = fichasRepo.buscarPorId(fichaId);
        if (!ficha || ficha.aluno_id !== id) {
          throw new AppError(404, 'NAO_ENCONTRADO', 'Ficha não encontrada.');
        }
        res.status(200).json(completionsRepo.progressoDaFicha(fichaId, id));
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

module.exports = fichasRoutes;
