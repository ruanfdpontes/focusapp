'use strict';

/**
 * Costura (seam) para a futura trava de "recinto" (§2.12). NO-OP hoje: nenhuma
 * checagem de localização/IP é feita. É montado na cadeia das rotas protegidas
 * como ponto único de extensão — NÃO implementar a trava agora.
 */
module.exports = (req, res, next) => next();
