'use strict';

const password = require('./auth/password');

/**
 * Semeia o banco de forma idempotente (§2.8). Checa por login/matricula antes
 * de inserir, de modo que rodar duas vezes mantém "exatamente um" de cada.
 * Todas as senhas são hasheadas com bcrypt; INSERTs setam status explicitamente.
 *
 * @param {import('better-sqlite3').Database} db conexão já migrada.
 */
function seed(db) {
  const seedTx = db.transaction(() => {
    // 1. Dono único (login 'dono' / 'dono123', aprovado, não troca senha).
    let dono = db.prepare("SELECT * FROM users WHERE role = 'dono'").get();
    if (!dono) {
      const info = db
        .prepare(
          `INSERT INTO users (role, nome, login, senha_hash, status, must_change_password)
           VALUES ('dono', ?, 'dono', ?, 'aprovado', 0)`
        )
        .run('Dono da Academia', password.hash('dono123'));
      dono = { id: info.lastInsertRowid };
    }

    // 2. Instrutor de exemplo (login 'instrutor' / 'instrutor123', must_change_password=1).
    let instrutor = db.prepare("SELECT * FROM users WHERE login = 'instrutor'").get();
    if (!instrutor) {
      const info = db
        .prepare(
          `INSERT INTO users (role, nome, login, senha_hash, status, must_change_password)
           VALUES ('instrutor', ?, 'instrutor', ?, 'aprovado', 1)`
        )
        .run('Instrutor de Exemplo', password.hash('instrutor123'));
      instrutor = { id: info.lastInsertRowid };
    }

    // 3. Aluno aprovado (matricula '2024001' / 'aluno123').
    let alunoAprovado = db.prepare("SELECT * FROM users WHERE matricula = '2024001'").get();
    if (!alunoAprovado) {
      const info = db
        .prepare(
          `INSERT INTO users (role, nome, matricula, senha_hash, status, must_change_password)
           VALUES ('aluno', ?, '2024001', ?, 'aprovado', 0)`
        )
        .run('Aluno Aprovado', password.hash('aluno123'));
      alunoAprovado = { id: info.lastInsertRowid };
    }

    // 4. Aluno pendente (matricula '2024002', status pendente).
    const alunoPendente = db.prepare("SELECT * FROM users WHERE matricula = '2024002'").get();
    if (!alunoPendente) {
      db.prepare(
        `INSERT INTO users (role, nome, matricula, senha_hash, status, must_change_password)
         VALUES ('aluno', ?, '2024002', ?, 'pendente', 0)`
      ).run('Aluno Pendente', password.hash('aluno123'));
    }

    // 5. Ficha ativa do aluno aprovado, criada pelo instrutor, com 3 exercícios.
    let ficha = db
      .prepare('SELECT * FROM fichas WHERE aluno_id = ? AND ativa = 1')
      .get(alunoAprovado.id);
    if (!ficha) {
      const fichaInfo = db
        .prepare(
          `INSERT INTO fichas (aluno_id, instrutor_id, titulo, ativa)
           VALUES (?, ?, ?, 1)`
        )
        .run(alunoAprovado.id, instrutor.id, 'Treino A — Full Body');
      const fichaId = fichaInfo.lastInsertRowid;

      const insertExercicio = db.prepare(
        `INSERT INTO exercicios (ficha_id, nome, series, repeticoes, carga, observacoes, ordem)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      const supino = insertExercicio.run(fichaId, 'Supino reto', 4, '8-12', '20kg', null, 0);
      insertExercicio.run(fichaId, 'Agachamento', 4, '10', 'barra', null, 1);
      insertExercicio.run(fichaId, 'Remada curvada', 3, '12', '15kg', null, 2);

      // 6. Progresso parcial: 2 das 4 séries do primeiro exercício (Supino reto).
      const insertCompletion = db.prepare(
        `INSERT OR IGNORE INTO completions (exercicio_id, aluno_id, serie_numero)
         VALUES (?, ?, ?)`
      );
      insertCompletion.run(supino.lastInsertRowid, alunoAprovado.id, 1);
      insertCompletion.run(supino.lastInsertRowid, alunoAprovado.id, 2);
    }
  });

  seedTx();
}

module.exports = seed;
