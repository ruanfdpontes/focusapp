'use strict';

const { AppError } = require('../errors');

/**
 * Repositório de exercícios. A reconciliação por id (§2.5/§2.7) é a peça central:
 * preserva completions dos exercícios mantidos, insere os novos e deleta só os
 * ausentes do payload (o cascade remove as completions deles).
 *
 * @param {import('better-sqlite3').Database} db
 */
function exerciciosRepo(db) {
  return {
    /** Exercícios de uma ficha, ordenados por ordem. */
    listarPorFicha(fichaId) {
      return db
        .prepare('SELECT * FROM exercicios WHERE ficha_id = ? ORDER BY ordem, id')
        .all(fichaId);
    },

    /** Insere um conjunto inicial de exercícios numa ficha (usado no POST ficha). */
    inserirMuitos(fichaId, exercicios) {
      const insert = db.prepare(
        `INSERT INTO exercicios (ficha_id, nome, series, repeticoes, carga, observacoes, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      exercicios.forEach((ex, idx) => {
        insert.run(
          fichaId,
          ex.nome,
          ex.series,
          ex.repeticoes,
          ex.carga ?? null,
          ex.observacoes ?? null,
          ex.ordem ?? idx
        );
      });
    },

    /**
     * Reconcilia os exercícios de uma ficha por id, numa transação:
     *  - item com id pertencente à ficha  -> UPDATE (preserva completions);
     *  - item sem id                      -> INSERT (novo);
     *  - exercício existente ausente       -> DELETE (cascade remove completions);
     *  - item com id de outra ficha        -> 400 DADOS_INVALIDOS.
     *
     * @throws {AppError} 400 DADOS_INVALIDOS se um id não pertence à ficha.
     */
    reconciliar(fichaId, exercicios) {
      const existentes = db
        .prepare('SELECT id FROM exercicios WHERE ficha_id = ?')
        .all(fichaId)
        .map((r) => r.id);
      const existentesSet = new Set(existentes);

      const insert = db.prepare(
        `INSERT INTO exercicios (ficha_id, nome, series, repeticoes, carga, observacoes, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const update = db.prepare(
        `UPDATE exercicios
         SET nome = ?, series = ?, repeticoes = ?, carga = ?, observacoes = ?, ordem = ?
         WHERE id = ? AND ficha_id = ?`
      );
      const del = db.prepare('DELETE FROM exercicios WHERE id = ?');

      const tx = db.transaction(() => {
        const mantidos = new Set();
        exercicios.forEach((ex, idx) => {
          if (ex.id != null) {
            if (!existentesSet.has(ex.id)) {
              throw new AppError(
                400,
                'DADOS_INVALIDOS',
                'Exercício informado não pertence a esta ficha.'
              );
            }
            update.run(
              ex.nome,
              ex.series,
              ex.repeticoes,
              ex.carga ?? null,
              ex.observacoes ?? null,
              ex.ordem ?? idx,
              ex.id,
              fichaId
            );
            mantidos.add(ex.id);
          } else {
            insert.run(
              fichaId,
              ex.nome,
              ex.series,
              ex.repeticoes,
              ex.carga ?? null,
              ex.observacoes ?? null,
              ex.ordem ?? idx
            );
          }
        });
        // DELETE dos existentes ausentes do payload.
        for (const id of existentes) {
          if (!mantidos.has(id)) {
            del.run(id);
          }
        }
      });

      tx();
    },
  };
}

module.exports = exerciciosRepo;
