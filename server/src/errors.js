'use strict';

/**
 * Erro de aplicação tipado. O middleware de erro central converte em
 * { erro: { codigo, mensagem } } com o status HTTP correspondente.
 */
class AppError extends Error {
  /**
   * @param {number} status código HTTP.
   * @param {string} codigo código de erro em MAIÚSCULAS (ex.: 'DADOS_INVALIDOS').
   * @param {string} mensagem mensagem legível em pt-BR.
   */
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    this.mensagem = mensagem;
  }
}

module.exports = { AppError };
