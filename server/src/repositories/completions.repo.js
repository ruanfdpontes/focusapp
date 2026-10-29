'use strict';

/**
 * Repositório de completions. Marcar é idempotente (INSERT OR IGNORE), desmarcar
 * é idempotente (DELETE que não falha se nada apagar). Progresso é derivado (§2.7).
 *
 * @param {import('better-sqlite3').Database} db
 */
function completionsRepo(db) {
  return {
    /**
     * Busca um exercício se ele pertence a uma ficha de um aluno específico.
     * @returns {object|null} linha do exercício (inclui series), ou null.
     */
    buscarExercicioDoAluno(exercicioId, alunoId) {
      return (
        db
          .prepare(
            `SELECT e.* FROM exercicios e
             JOIN fichas f ON f.id = e.ficha_id
             WHERE e.id = ? AND f.aluno_id = ?`
          )
          .get(exercicioId, alunoId) || null
      );
    },

    /** Marca uma série como concluída (idempotente). */
    marcar(exercicioId, alunoId, serieNumero) {
      db.prepare(
        `INSERT OR IGNORE INTO completions (exercicio_id, aluno_id, serie_numero)
         VALUES (?, ?, ?)`
      ).run(exercicioId, alunoId, serieNumero);
    },

    /** Desmarca uma série (idempotente: não falha se nada apagar). */
    desmarcar(exercicioId, alunoId, serieNumero) {
      db.prepare(
        `DELETE FROM completions
         WHERE exercicio_id = ? AND aluno_id = ? AND serie_numero = ?`
      ).run(exercicioId, alunoId, serieNumero);
    },

    /**
     * Séries concluídas (números) de um exercício para um aluno, ordenadas.
     * @returns {number[]}
     */
    seriesConcluidas(exercicioId, alunoId) {
      return db
        .prepare(
          `SELECT serie_numero FROM completions
           WHERE exercicio_id = ? AND aluno_id = ? ORDER BY serie_numero`
        )
        .all(exercicioId, alunoId)
        .map((r) => r.serie_numero);
    },

    /**
     * Progresso derivado de uma ficha (§2.7). percentual = Math.round com guarda
     * de divisão por zero.
     * @returns {{ exercicios, totalSeries, totalConcluidas, percentual }}
     */
    progressoDaFicha(fichaId, alunoId) {
      const exercicios = db
        .prepare('SELECT * FROM exercicios WHERE ficha_id = ? ORDER BY ordem, id')
        .all(fichaId);

      let totalSeries = 0;
      let totalConcluidas = 0;
      const detalhe = exercicios.map((ex) => {
        const concluidasArr = this.seriesConcluidas(ex.id, alunoId);
        totalSeries += ex.series;
        totalConcluidas += concluidasArr.length;
        return {
          exercicioId: ex.id,
          series: ex.series,
          concluidas: concluidasArr.length,
          seriesConcluidas: concluidasArr,
        };
      });

      const percentual =
        totalSeries === 0 ? 0 : Math.round((100 * totalConcluidas) / totalSeries);

      return { exercicios: detalhe, totalSeries, totalConcluidas, percentual };
    },
  };
}

module.exports = completionsRepo;
