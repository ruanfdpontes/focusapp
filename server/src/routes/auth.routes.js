'use strict';

const express = require('express');

const { AppError } = require('../errors');
const password = require('../auth/password');
const tokens = require('../auth/tokens');
const validators = require('../validators');
const usersRepoFactory = require('../repositories/users.repo');
const authenticate = require('../middleware/authenticate');

/**
 * Shape ÚNICO do objeto user retornado por /auth/login e /auth/me (FIX 3).
 * Inclui sempre status, igualando os dois endpoints.
 */
function userPublico(row) {
  return {
    id: row.id,
    nome: row.nome,
    role: row.role,
    mustChangePassword: row.must_change_password === 1,
    status: row.status,
  };
}

function authRoutes(db) {
  const router = express.Router();
  const usersRepo = usersRepoFactory(db);

  // POST /auth/login — público.
  router.post('/login', (req, res, next) => {
    try {
      const { credencial, senha } = validators.validarLogin(req.body);
      const user = usersRepo.buscarPorCredencial(credencial);
      if (!user || !password.verify(senha, user.senha_hash)) {
        throw new AppError(401, 'CREDENCIAIS_INVALIDAS', 'Credenciais inválidas.');
      }
      if (user.role === 'aluno') {
        if (user.status === 'pendente') {
          throw new AppError(403, 'CONTA_PENDENTE', 'Sua conta ainda está em análise pelo dono da academia.');
        }
        if (user.status === 'rejeitado') {
          throw new AppError(403, 'CONTA_REJEITADA', 'Sua solicitação de conta foi rejeitada.');
        }
      }
      const token = tokens.sign({ sub: user.id, role: user.role });
      res.status(200).json({ token, user: userPublico(user) });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/change-password — T, isenta de requirePasswordChanged.
  router.post('/change-password', authenticate, (req, res, next) => {
    try {
      const { senhaAtual, novaSenha } = validators.validarTrocaSenha(req.body);
      if (!password.verify(senhaAtual, req.user.senha_hash)) {
        throw new AppError(401, 'SENHA_ATUAL_INVALIDA', 'Senha atual incorreta.');
      }
      usersRepo.atualizarSenha(req.user.id, password.hash(novaSenha));
      const atualizado = usersRepo.buscarPorId(req.user.id);
      const token = tokens.sign({ sub: atualizado.id, role: atualizado.role });
      res.status(200).json({ ok: true, token, user: userPublico(atualizado) });
    } catch (err) {
      next(err);
    }
  });

  // POST /auth/logout — T, isenta; no-op stateless.
  router.post('/logout', authenticate, (req, res) => {
    res.status(200).json({ ok: true });
  });

  // GET /auth/me — T, isenta de requirePasswordChanged.
  router.get('/me', authenticate, (req, res) => {
    res.status(200).json({ user: userPublico(req.user) });
  });

  return router;
}

module.exports = authRoutes;
module.exports.userPublico = userPublico;
