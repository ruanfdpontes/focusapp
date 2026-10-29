'use strict';

const { AppError } = require('../errors');

/**
 * Bloqueia rotas protegidas quando o usuário precisa trocar a senha (§2.6).
 * Lê a flag do registro recarregado do banco (req.user populado por authenticate),
 * nunca do claim do token. Aplicado às protegidas EXCETO change-password, logout
 * e GET /auth/me.
 */
function requirePasswordChanged(req, res, next) {
  if (req.user && req.user.must_change_password === 1) {
    return next(
      new AppError(409, 'SENHA_DEVE_SER_TROCADA', 'É necessário trocar a senha antes de continuar.')
    );
  }
  next();
}

module.exports = requirePasswordChanged;
