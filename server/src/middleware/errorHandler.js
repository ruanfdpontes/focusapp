'use strict';

const { AppError } = require('../errors');

/**
 * Middleware de erro central (§2.10). Formato único { erro: { codigo, mensagem } }.
 * AppError -> seu status; inesperado -> 500 ERRO_INTERNO (mensagem genérica).
 * Log em warn p/ 4xx esperados e error p/ 5xx; NUNCA loga senha/hash.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      // eslint-disable-next-line no-console
      console.error(`[${err.codigo}] ${err.mensagem}`);
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[${err.codigo}] ${err.mensagem}`);
    }
    return res.status(err.status).json({
      erro: { codigo: err.codigo, mensagem: err.mensagem },
    });
  }

  // Erro inesperado: não vaza detalhes nem segredos.
  // eslint-disable-next-line no-console
  console.error('[ERRO_INTERNO]', err && err.stack ? err.stack : err);
  return res.status(500).json({
    erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor.' },
  });
}

module.exports = errorHandler;
