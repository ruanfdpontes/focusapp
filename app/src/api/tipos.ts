// Tipos compartilhados do contrato da API (shapes do backend Focus).

export type Papel = "aluno" | "instrutor" | "dono";
export type StatusConta = "pendente" | "aprovado" | "rejeitado";

// Shape de user identico em /auth/login e /auth/me (FIX 3 do backend).
export interface Usuario {
  id: number;
  nome: string;
  role: Papel;
  mustChangePassword: boolean;
  status: StatusConta;
}

export interface RespostaLogin {
  token: string;
  user: Usuario;
}

export interface RespostaMe {
  user: Usuario;
}

export interface RespostaTrocaSenha {
  ok: true;
  token: string;
  user: Usuario;
}

export interface SolicitacaoConta {
  id: number;
  nome: string;
  matricula: string;
  status: StatusConta;
  created_at: string;
}

export interface Instrutor {
  id: number;
  nome: string;
  login: string;
  mustChangePassword: boolean;
}

export interface AlunoResumo {
  id: number;
  nome: string;
  matricula: string;
  status: StatusConta;
}

export interface Exercicio {
  id: number;
  nome: string;
  series: number;
  repeticoes: string;
  carga: string | null;
  observacoes: string | null;
  ordem: number;
  seriesConcluidas: number[];
}

export interface Ficha {
  id: number;
  titulo: string;
  ativa: boolean;
  exercicios: Exercicio[];
}

// Exercicio no payload de criacao/edicao de ficha (id opcional).
export interface ExercicioPayload {
  id?: number;
  nome: string;
  series: number;
  repeticoes: string;
  carga?: string | null;
  observacoes?: string | null;
  ordem?: number;
}

export interface ProgressoExercicio {
  exercicioId: number;
  series: number;
  concluidas: number;
  seriesConcluidas: number[];
}

export interface Progresso {
  exercicios: ProgressoExercicio[];
  totalSeries: number;
  totalConcluidas: number;
  percentual: number;
}
