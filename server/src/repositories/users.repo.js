'use strict';

const { AppError } = require('../errors');

/**
 * Repositório de usuários (tabela única com discriminador role). Todas as queries
 * são síncronas (better-sqlite3). INSERTs setam status explicitamente (§2.5).
 *
 * @param {import('better-sqlite3').Database} db
 */
function usersRepo(db) {
  /** Shape público do aluno exposto nas listas (§2.7). */
  function mapAluno(row) {
    return { id: row.id, nome: row.nome, matricula: row.matricula, status: row.status };
  }

  /** Shape público do instrutor (§2.7). */
  function mapInstrutor(row) {
    return {
      id: row.id,
      nome: row.nome,
      login: row.login,
      mustChangePassword: row.must_change_password === 1,
    };
  }

  return {
    /** Usuário cru por id, ou undefined. */
    buscarPorId(id) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    /**
     * Resolve credencial de login: matricula (aluno) OU login (instrutor/dono).
     * Colisão teórica (>1 linha) é tratada como credencial inválida (§2.6).
     * @returns {object|null} usuário cru, ou null se não existe / colisão.
     */
    buscarPorCredencial(credencial) {
      const rows = db
        .prepare('SELECT * FROM users WHERE matricula = ? OR login = ?')
        .all(credencial, credencial);
      if (rows.length !== 1) return null;
      return rows[0];
    },

    /**
     * Cria uma solicitação de conta de aluno. status='pendente' EXPLÍCITO (§2.5).
     * @returns {{ id: number, status: 'pendente' }}
     * @throws {AppError} 409 MATRICULA_EM_USO se a matrícula já existe.
     */
    criarSolicitacaoAluno({ matricula, nome, senhaHash }) {
      const existente = db.prepare('SELECT id FROM users WHERE matricula = ?').get(matricula);
      if (existente) {
        throw new AppError(409, 'MATRICULA_EM_USO', 'Esta matrícula já está em uso.');
      }
      const info = db
        .prepare(
          `INSERT INTO users (role, nome, matricula, senha_hash, status, must_change_password)
           VALUES ('aluno', ?, ?, ?, 'pendente', 0)`
        )
        .run(nome, matricula, senhaHash);
      return { id: Number(info.lastInsertRowid), status: 'pendente' };
    },

    /**
     * Cria um instrutor (status='aprovado', must_change_password=1 EXPLÍCITOS).
     * @returns {{ id, nome, login, mustChangePassword: true }}
     * @throws {AppError} 409 LOGIN_EM_USO se o login já existe.
     */
    criarInstrutor({ nome, login, senhaHash }) {
      const existente = db.prepare('SELECT id FROM users WHERE login = ?').get(login);
      if (existente) {
        throw new AppError(409, 'LOGIN_EM_USO', 'Este login já está em uso.');
      }
      const info = db
        .prepare(
          `INSERT INTO users (role, nome, login, senha_hash, status, must_change_password)
           VALUES ('instrutor', ?, ?, ?, 'aprovado', 1)`
        )
        .run(nome, login, senhaHash);
      return {
        id: Number(info.lastInsertRowid),
        nome,
        login,
        mustChangePassword: true,
      };
    },

    /**
     * Aprova uma solicitação. Só de 'pendente'; senão sinaliza estado inválido.
     * @throws {AppError} 404 NAO_ENCONTRADO / 409 ESTADO_INVALIDO.
     */
    aprovarSolicitacao(id) {
      return transicionarSolicitacao(id, 'aprovado');
    },

    /**
     * Rejeita uma solicitação. Só de 'pendente'; senão sinaliza estado inválido.
     * @throws {AppError} 404 NAO_ENCONTRADO / 409 ESTADO_INVALIDO.
     */
    rejeitarSolicitacao(id) {
      return transicionarSolicitacao(id, 'rejeitado');
    },

    /**
     * Lista alunos (role='aluno'), opcionalmente filtrando por status.
     * @param {string|null} status 'pendente'|'aprovado'|'rejeitado' ou null p/ todos.
     */
    listarAlunos(status) {
      if (status) {
        return db
          .prepare("SELECT * FROM users WHERE role = 'aluno' AND status = ? ORDER BY nome")
          .all(status)
          .map(mapAluno);
      }
      return db
        .prepare("SELECT * FROM users WHERE role = 'aluno' ORDER BY nome")
        .all()
        .map(mapAluno);
    },

    /** Lista solicitações de aluno por status (default 'pendente'). */
    listarSolicitacoes(status) {
      return db
        .prepare(
          `SELECT id, nome, matricula, status, created_at
           FROM users WHERE role = 'aluno' AND status = ? ORDER BY created_at`
        )
        .all(status);
    },

    /** Lista instrutores. */
    listarInstrutores() {
      return db
        .prepare("SELECT * FROM users WHERE role = 'instrutor' ORDER BY nome")
        .all()
        .map(mapInstrutor);
    },

    /** Busca um aluno por id; retorna null se não existir ou não for role='aluno'. */
    buscarAlunoPorId(id) {
      const row = db
        .prepare("SELECT * FROM users WHERE id = ? AND role = 'aluno'")
        .get(id);
      return row ? mapAluno(row) : null;
    },

    /**
     * Atualiza a senha e zera must_change_password. Usado na troca obrigatória.
     */
    atualizarSenha(id, senhaHash) {
      db.prepare(
        `UPDATE users
         SET senha_hash = ?, must_change_password = 0, updated_at = datetime('now')
         WHERE id = ?`
      ).run(senhaHash, id);
    },

    mapAluno,
    mapInstrutor,
  };

  function transicionarSolicitacao(id, novoStatus) {
    const row = db
      .prepare("SELECT * FROM users WHERE id = ? AND role = 'aluno'")
      .get(id);
    if (!row) {
      throw new AppError(404, 'NAO_ENCONTRADO', 'Solicitação não encontrada.');
    }
    if (row.status !== 'pendente') {
      throw new AppError(
        409,
        'ESTADO_INVALIDO',
        'A solicitação não está pendente.'
      );
    }
    db.prepare(
      `UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(novoStatus, id);
    return { id: Number(id), status: novoStatus };
  }
}

module.exports = usersRepo;
