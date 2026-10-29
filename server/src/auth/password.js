'use strict';

const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Gera o hash bcrypt de uma senha. Nunca armazene nem logue a senha em texto puro.
 * @param {string} senha
 * @returns {string} hash bcrypt.
 */
function hash(senha) {
  return bcrypt.hashSync(senha, config.BCRYPT_COST);
}

/**
 * Verifica uma senha contra um hash bcrypt.
 * @param {string} senha
 * @param {string} hashArmazenado
 * @returns {boolean}
 */
function verify(senha, hashArmazenado) {
  return bcrypt.compareSync(senha, hashArmazenado);
}

module.exports = { hash, verify };
