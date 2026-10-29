'use strict';

const tokens = require('../auth/tokens');
const { AppError } = require('../errors');

/**
 * Middleware de autenticação (§2.6). Exige Bearer, verifica o JWT apenas para obter
 * `sub`, e RECARREGA o usuário do banco populando req.user com status e
 * must_change_password FRESCOS. O claim do token nunca é fonte de autoridade.
 *
 *  - token ausente/inválido/expirado -> 401 TOKEN_INVALIDO;
 *  - usuário sumiu do banco           -> 401 TOKEN_INVALIDO;
 *  - aluno que deixou de estar aprovado -> 403 CONTA_NAO_APROVADA.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/.exec(header);
  if (!match) {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'Token ausente ou inválido.'));
  }

  let payload;
  try {
    payload = tokens.verify(match[1]);
  } catch {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'Token ausente ou inválido.'));
  }

  const db = req.app.locals.db;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) {
    return next(new AppError(401, 'TOKEN_INVALIDO', 'Token ausente ou inválido.'));
  }

  if (user.role === 'aluno' && user.status !== 'aprovado') {
    return next(new AppError(403, 'CONTA_NAO_APROVADA', 'Sua conta não está aprovada.'));
  }

  req.user = user;
  next();
}

module.exports = authenticate;
