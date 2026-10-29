'use strict';

const { AppError } = require('../errors');
const exerciciosRepoFactory = require('./exercicios.repo');
const completionsRepoFactory = require('./completions.repo');

/**
 * Repositório de fichas. Impõe a invariante "no máximo uma ficha ativa por aluno"
 * (§2.5/§2.7) desativando as demais numa transação antes de ativar a alvo. O índice
 * único parcial uq_ficha_ativa é a rede de segurança (violação -> 409 ESTADO_INVALIDO).
 *
 * @param {import('better-sqlite3').Database} db
 */
function fichasRepo(db) {
  const exerciciosRepo = exerciciosRepoFactory(db);
  const completionsRepo = completionsRepoFactory(db);

  function buscarPorId(fichaId) {
    return db.prepare('SELECT * FROM fichas WHERE id = ?').get(fichaId);
  }

  /**
   * Monta uma ficha com exercícios e seriesConcluidas por exercício (§2.7).
   */
  function montarFicha(ficha, alunoId) {
    const exercicios = exerciciosRepo.listarPorFicha(ficha.id).map((ex) => ({
      id: ex.id,
      nome: ex.nome,
      series: ex.series,
      repeticoes: ex.repeticoes,
      carga: ex.carga,
      observacoes: ex.observacoes,
      ordem: ex.ordem,
      seriesConcluidas: completionsRepo.seriesConcluidas(ex.id, alunoId),
    }));
    return {
      id: ficha.id,
      titulo: ficha.titulo,
      ativa: ficha.ativa === 1,
      exercicios,
    };
  }

  return {
    buscarPorId,
    montarFicha,

    /** Fichas de um aluno (com exercícios e seriesConcluidas). */
    listarPorAluno(alunoId) {
      const fichas = db
        .prepare('SELECT * FROM fichas WHERE aluno_id = ? ORDER BY ativa DESC, id DESC')
        .all(alunoId);
      return fichas.map((f) => montarFicha(f, alunoId));
    },

    /**
     * Cria uma ficha e seus exercícios. Se ativa (default), desativa as demais do
     * aluno numa transação (defesa em profundidade + índice único parcial).
     * @returns {object} ficha montada.
     * @throws {AppError} 409 ESTADO_INVALIDO na violação do índice.
     */
    criar({ alunoId, instrutorId, titulo, ativa = true, exercicios }) {
      const tx = db.transaction(() => {
        if (ativa) {
          db.prepare('UPDATE fichas SET ativa = 0 WHERE aluno_id = ?').run(alunoId);
        }
        const info = db
          .prepare(
            `INSERT INTO fichas (aluno_id, instrutor_id, titulo, ativa)
             VALUES (?, ?, ?, ?)`
          )
          .run(alunoId, instrutorId, titulo, ativa ? 1 : 0);
        const fichaId = Number(info.lastInsertRowid);
        exerciciosRepo.inserirMuitos(fichaId, exercicios);
        return fichaId;
      });

      const fichaId = runTx(tx);
      return montarFicha(buscarPorId(fichaId), alunoId);
    },

    /**
     * Atualiza titulo e/ou ativa de uma ficha, re-aplicando a invariante de ativa única.
     * @returns {object} ficha montada.
     * @throws {AppError} 409 ESTADO_INVALIDO na violação do índice.
     */
    atualizar(fichaId, { titulo, ativa }) {
      const ficha = buscarPorId(fichaId);
      if (!ficha) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Ficha não encontrada.');
      }

      const tx = db.transaction(() => {
        if (ativa === true) {
          db.prepare('UPDATE fichas SET ativa = 0 WHERE aluno_id = ? AND id <> ?').run(
            ficha.aluno_id,
            fichaId
          );
        }
        const sets = [];
        const params = [];
        if (titulo !== undefined) {
          sets.push('titulo = ?');
          params.push(titulo);
        }
        if (ativa !== undefined) {
          sets.push('ativa = ?');
          params.push(ativa ? 1 : 0);
        }
        sets.push("updated_at = datetime('now')");
        params.push(fichaId);
        db.prepare(`UPDATE fichas SET ${sets.join(', ')} WHERE id = ?`).run(...params);
      });

      runTx(tx);
      return montarFicha(buscarPorId(fichaId), ficha.aluno_id);
    },

    /**
     * Reconcilia os exercícios de uma ficha (preserva completions). Retorna a ficha montada.
     * @throws {AppError} 404 NAO_ENCONTRADO / 400 DADOS_INVALIDOS (id de outra ficha).
     */
    reconciliarExercicios(fichaId, exercicios) {
      const ficha = buscarPorId(fichaId);
      if (!ficha) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Ficha não encontrada.');
      }
      exerciciosRepo.reconciliar(fichaId, exercicios);
      return montarFicha(buscarPorId(fichaId), ficha.aluno_id);
    },

    /** Deleta uma ficha (cascade remove exercícios e completions). */
    deletar(fichaId) {
      const ficha = buscarPorId(fichaId);
      if (!ficha) {
        throw new AppError(404, 'NAO_ENCONTRADO', 'Ficha não encontrada.');
      }
      db.prepare('DELETE FROM fichas WHERE id = ?').run(fichaId);
    },
  };

  /**
   * Executa uma transação better-sqlite3, mapeando violação do índice único parcial
   * de ficha ativa para 409 ESTADO_INVALIDO.
   */
  function runTx(tx) {
    try {
      return tx();
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (
        err &&
        typeof err.message === 'string' &&
        err.message.includes('uq_ficha_ativa')
      ) {
        throw new AppError(
          409,
          'ESTADO_INVALIDO',
          'Já existe uma ficha ativa para este aluno.'
        );
      }
      throw err;
    }
  }
}

module.exports = fichasRepo;
