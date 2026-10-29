'use strict';

const { AppError } = require('./errors');

/**
 * Validação de entradas externas (§2.11). Roda na rota, antes do repositório;
 * falha -> 400 DADOS_INVALIDOS (salvo códigos específicos de §2.10). O banco é
 * a última defesa (CHECK/UNIQUE/FK).
 */

function erroDados(mensagem) {
  return new AppError(400, 'DADOS_INVALIDOS', mensagem);
}

function ehString(v) {
  return typeof v === 'string';
}

function trimOuVazio(v) {
  return ehString(v) ? v.trim() : '';
}

/** Inteiro positivo (para IDs de rota e exercicios[].id). */
function parseIdPositivo(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

/** Valida um :id/:fichaId de rota; retorna inteiro ou lança 400. */
function validarIdRota(valor, campo = 'id') {
  const n = parseIdPositivo(valor);
  if (n === null) {
    throw erroDados(`Parâmetro '${campo}' inválido.`);
  }
  return n;
}

/** POST /accounts/requests — { matricula, nome, senha }. */
function validarSolicitacaoConta(body) {
  const matricula = trimOuVazio(body && body.matricula);
  const nome = trimOuVazio(body && body.nome);
  const senha = body && body.senha;

  if (!matricula || matricula.length > 30) {
    throw erroDados('Matrícula é obrigatória (até 30 caracteres).');
  }
  if (nome.length < 2 || nome.length > 120) {
    throw erroDados('Nome deve ter entre 2 e 120 caracteres.');
  }
  if (!ehString(senha) || senha.length < 6) {
    throw erroDados('Senha deve ter no mínimo 6 caracteres.');
  }
  return { matricula, nome, senha };
}

/** POST /auth/login — { credencial, senha }. */
function validarLogin(body) {
  const credencial = trimOuVazio(body && body.credencial);
  const senha = body && body.senha;
  if (!credencial) {
    throw erroDados('Credencial é obrigatória.');
  }
  if (!ehString(senha) || senha.length === 0) {
    throw erroDados('Senha é obrigatória.');
  }
  return { credencial, senha };
}

/** POST /auth/change-password — { senhaAtual, novaSenha }. */
function validarTrocaSenha(body) {
  const senhaAtual = body && body.senhaAtual;
  const novaSenha = body && body.novaSenha;
  if (!ehString(senhaAtual) || senhaAtual.length === 0) {
    throw erroDados('Senha atual é obrigatória.');
  }
  if (!ehString(novaSenha) || novaSenha.length < 6) {
    throw new AppError(400, 'SENHA_FRACA', 'A nova senha deve ter no mínimo 6 caracteres.');
  }
  if (novaSenha === senhaAtual) {
    throw new AppError(
      400,
      'NOVA_SENHA_IGUAL',
      'A nova senha deve ser diferente da atual.'
    );
  }
  return { senhaAtual, novaSenha };
}

/** POST /instrutores — { nome, login, senhaPadrao }. */
function validarCriarInstrutor(body) {
  const nome = trimOuVazio(body && body.nome);
  const login = trimOuVazio(body && body.login);
  const senhaPadrao = body && body.senhaPadrao;

  if (nome.length < 2 || nome.length > 120) {
    throw erroDados('Nome deve ter entre 2 e 120 caracteres.');
  }
  if (login.length < 3 || login.length > 40 || !/^[a-z0-9._-]+$/.test(login)) {
    throw erroDados(
      'Login deve ter 3 a 40 caracteres (letras minúsculas, números, . _ -).'
    );
  }
  if (!ehString(senhaPadrao) || senhaPadrao.length < 6) {
    throw erroDados('Senha padrão deve ter no mínimo 6 caracteres.');
  }
  return { nome, login, senhaPadrao };
}

/** Status aceito em ?status= (null se ausente/vazio). Lança 400 se inválido. */
function validarStatusQuery(status) {
  if (status === undefined || status === null || status === '') return null;
  if (!['pendente', 'aprovado', 'rejeitado'].includes(status)) {
    throw erroDados("Parâmetro 'status' inválido.");
  }
  return status;
}

/** Valida um item de exercicios[], com ou sem id (reconciliação). */
function validarExercicio(ex, permitirId) {
  if (!ex || typeof ex !== 'object') {
    throw erroDados('Exercício inválido.');
  }
  const out = {};

  if (ex.id !== undefined && ex.id !== null) {
    if (!permitirId) {
      throw erroDados('Exercício não pode ter id na criação da ficha.');
    }
    const id = parseIdPositivo(ex.id);
    if (id === null) {
      throw erroDados('Campo exercicios[].id inválido.');
    }
    out.id = id;
  }

  const nome = trimOuVazio(ex.nome);
  if (nome.length < 1 || nome.length > 120) {
    throw erroDados('Nome do exercício deve ter de 1 a 120 caracteres.');
  }
  out.nome = nome;

  if (!Number.isInteger(ex.series) || ex.series < 1 || ex.series > 20) {
    throw erroDados('Séries deve ser um inteiro entre 1 e 20.');
  }
  out.series = ex.series;

  const repeticoes = trimOuVazio(ex.repeticoes);
  if (repeticoes.length < 1 || repeticoes.length > 40) {
    throw erroDados('Repetições deve ter de 1 a 40 caracteres.');
  }
  out.repeticoes = repeticoes;

  if (ex.carga !== undefined && ex.carga !== null) {
    if (!ehString(ex.carga) || ex.carga.length > 120) {
      throw erroDados('Carga inválida (até 120 caracteres).');
    }
    out.carga = ex.carga;
  } else {
    out.carga = null;
  }

  if (ex.observacoes !== undefined && ex.observacoes !== null) {
    if (!ehString(ex.observacoes) || ex.observacoes.length > 500) {
      throw erroDados('Observações inválidas (até 500 caracteres).');
    }
    out.observacoes = ex.observacoes;
  } else {
    out.observacoes = null;
  }

  if (ex.ordem !== undefined && ex.ordem !== null) {
    if (!Number.isInteger(ex.ordem) || ex.ordem < 0) {
      throw erroDados('Ordem deve ser um inteiro >= 0.');
    }
    out.ordem = ex.ordem;
  }

  return out;
}

/**
 * Valida o array exercicios (FIX 2). POST: 1-50 itens. PUT: 0-50 itens (vazio = remover todos).
 * @param {*} exercicios
 * @param {{ min: number, permitirId: boolean }} opts
 */
function validarArrayExercicios(exercicios, { min, permitirId }) {
  if (!Array.isArray(exercicios)) {
    throw erroDados('Campo exercicios é obrigatório e deve ser uma lista.');
  }
  if (exercicios.length < min || exercicios.length > 50) {
    throw erroDados(
      `A lista de exercícios deve ter de ${min} a 50 itens.`
    );
  }
  return exercicios.map((ex) => validarExercicio(ex, permitirId));
}

/**
 * Valida o título da ficha (FIX 1). obrigatorio=true no POST, false no PUT.
 * Ausente/vazio/não-string no POST -> 400 ANTES do repositório (nunca 500 da NOT NULL).
 * @returns {string|undefined} título validado, ou undefined se opcional e ausente.
 */
function validarTituloFicha(titulo, obrigatorio) {
  if (titulo === undefined || titulo === null) {
    if (obrigatorio) {
      throw erroDados('Título é obrigatório.');
    }
    return undefined;
  }
  if (!ehString(titulo)) {
    throw erroDados('Título deve ser um texto.');
  }
  const t = titulo.trim();
  if (t.length < 1 || t.length > 120) {
    throw erroDados('Título deve ter de 1 a 120 caracteres.');
  }
  return t;
}

/** POST /alunos/:id/fichas — { titulo, ativa?, exercicios[1..50] }. */
function validarCriarFicha(body) {
  const titulo = validarTituloFicha(body && body.titulo, true);
  const exercicios = validarArrayExercicios(body && body.exercicios, {
    min: 1,
    permitirId: false,
  });
  let ativa = true;
  if (body && body.ativa !== undefined) {
    if (typeof body.ativa !== 'boolean') {
      throw erroDados("Campo 'ativa' deve ser booleano.");
    }
    ativa = body.ativa;
  }
  return { titulo, ativa, exercicios };
}

/** PUT /fichas/:fichaId — { titulo?, ativa? }. */
function validarAtualizarFicha(body) {
  const out = {};
  const titulo = validarTituloFicha(body && body.titulo, false);
  if (titulo !== undefined) out.titulo = titulo;
  if (body && body.ativa !== undefined) {
    if (typeof body.ativa !== 'boolean') {
      throw erroDados("Campo 'ativa' deve ser booleano.");
    }
    out.ativa = body.ativa;
  }
  if (out.titulo === undefined && out.ativa === undefined) {
    throw erroDados('Informe título e/ou ativa para atualizar.');
  }
  return out;
}

/** PUT /fichas/:fichaId/exercicios — { exercicios[0..50] }. */
function validarReconciliarExercicios(body) {
  const exercicios = validarArrayExercicios(body && body.exercicios, {
    min: 0,
    permitirId: true,
  });
  return { exercicios };
}

/** POST/DELETE /completions — { exercicioId, serieNumero }. */
function validarCompletion(body) {
  const exercicioId = parseIdPositivo(body && body.exercicioId);
  if (exercicioId === null) {
    throw erroDados('exercicioId é obrigatório e deve ser um inteiro positivo.');
  }
  if (!Number.isInteger(body && body.serieNumero) || body.serieNumero < 1) {
    throw erroDados('serieNumero deve ser um inteiro >= 1.');
  }
  return { exercicioId, serieNumero: body.serieNumero };
}

module.exports = {
  erroDados,
  validarIdRota,
  validarSolicitacaoConta,
  validarLogin,
  validarTrocaSenha,
  validarCriarInstrutor,
  validarStatusQuery,
  validarTituloFicha,
  validarArrayExercicios,
  validarExercicio,
  validarCriarFicha,
  validarAtualizarFicha,
  validarReconciliarExercicios,
  validarCompletion,
};
