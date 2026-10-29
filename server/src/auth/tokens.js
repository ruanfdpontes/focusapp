'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Assina um JWT. O payload NÃO carrega mustChangePassword como autoridade —
 * o enforcement lê sempre o registro recarregado do banco (§2.6).
 *
 * @param {{ sub: number|string, role: string }} payload
 * @returns {string} token JWT.
 */
function sign(payload) {
  return jwt.sign({ sub: payload.sub, role: payload.role }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES,
  });
}

/**
 * Verifica e decodifica um JWT. Lança se inválido/expirado.
 * @param {string} token
 * @returns {object} payload decodificado.
 */
function verify(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

module.exports = { sign, verify };
