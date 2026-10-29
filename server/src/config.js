'use strict';

require('dotenv').config();

const path = require('path');

/**
 * Configuração do servidor, lida do ambiente com defaults seguros para a demo.
 * AVISO: JWT_SECRET default e credenciais de seed são SOMENTE-DEMO.
 */
const config = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'focus-demo-secret-trocar-em-producao',
  DB_PATH: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'focus.db'),
  JWT_EXPIRES: process.env.JWT_EXPIRES || '12h',
  BCRYPT_COST: Number(process.env.BCRYPT_COST) || 10,
};

module.exports = config;
