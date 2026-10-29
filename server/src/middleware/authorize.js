'use strict';

const { AppError } = require('../errors');

/**
 * Factory de middleware de autorização por role (§2.7). Deve rodar após authenticate.
 * @param {...string} roles roles permitidas.
 */
function authorize(...roles) {
  return function (req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'ACESSO_NEGADO', 'Acesso negado.'));
    }
    next();
  };
}

module.exports = authorize;
