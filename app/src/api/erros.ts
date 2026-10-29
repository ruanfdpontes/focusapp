// Mapa de codigo de erro da API -> mensagem em pt-BR para exibir ao usuario.
// O backend responde no formato { erro: { codigo, mensagem } }. Preferimos
// nossas mensagens locais pelo codigo; se o codigo for desconhecido, caimos
// na mensagem enviada pelo servidor ou em uma mensagem generica.

export const CODIGO_ERRO_REDE = "ERRO_REDE";

const MENSAGENS: Record<string, string> = {
  // Login
  CREDENCIAIS_INVALIDAS: "Credencial ou senha incorretos.",
  CONTA_PENDENTE: "Sua conta ainda está em análise pelo dono da academia.",
  CONTA_REJEITADA: "Sua solicitação de conta foi rejeitada.",

  // Sessao / autorizacao
  TOKEN_INVALIDO: "Sua sessão expirou. Entre novamente.",
  CONTA_NAO_APROVADA: "Sua conta não está mais aprovada. Fale com o dono da academia.",
  ACESSO_NEGADO: "Você não tem permissão para acessar isto.",
  SENHA_DEVE_SER_TROCADA: "Você precisa trocar sua senha antes de continuar.",

  // Troca de senha
  SENHA_ATUAL_INVALIDA: "A senha atual está incorreta.",
  SENHA_FRACA: "A nova senha deve ter pelo menos 6 caracteres.",
  NOVA_SENHA_IGUAL: "A nova senha deve ser diferente da atual.",

  // Contas / instrutores
  MATRICULA_EM_USO: "Já existe uma solicitação ou conta com esta matrícula.",
  LOGIN_EM_USO: "Este login já está em uso.",

  // Fichas / alunos
  ALUNO_NAO_ENCONTRADO: "Aluno não encontrado.",
  ALUNO_NAO_APROVADO: "Este aluno ainda não está aprovado.",
  NAO_ENCONTRADO: "Registro não encontrado.",
  ESTADO_INVALIDO: "Esta operação não é válida para o estado atual.",

  // Validacao / genericos
  DADOS_INVALIDOS: "Há campos inválidos. Verifique os dados informados.",
  ERRO_INTERNO: "Ocorreu um erro no servidor. Tente novamente.",

  // Rede (gerado no cliente)
  [CODIGO_ERRO_REDE]:
    "Não foi possível conectar ao servidor. Verifique se o servidor está ligado e o endereço da API.",
};

export function mensagemDeErro(
  codigo?: string,
  mensagemServidor?: string,
): string {
  if (codigo && MENSAGENS[codigo]) {
    return MENSAGENS[codigo];
  }
  if (mensagemServidor && mensagemServidor.trim().length > 0) {
    return mensagemServidor;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
