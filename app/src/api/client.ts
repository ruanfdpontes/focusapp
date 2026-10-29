import { API_BASE_URL } from "@/config";
import { CODIGO_ERRO_REDE, mensagemDeErro } from "@/api/erros";

// Erro tipado lancado pelo client. Carrega o codigo da API (ou ERRO_REDE),
// o status HTTP e uma mensagem ja traduzida para pt-BR.
export class ApiError extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensagem: string, status: number) {
    super(mensagem);
    this.name = "ApiError";
    this.codigo = codigo;
    this.status = status;
  }
}

type Metodo = "GET" | "POST" | "PUT" | "DELETE";

interface OpcoesRequisicao {
  metodo?: Metodo;
  corpo?: unknown;
  token?: string | null;
}

// Fonte do token para requisicoes autenticadas. O AuthContext registra um
// getter aqui no boot, evitando passar o token manualmente em cada chamada.
let obterToken: () => string | null = () => null;

export function registrarProvedorDeToken(fn: () => string | null): void {
  obterToken = fn;
}

async function requisitar<T>(
  caminho: string,
  opcoes: OpcoesRequisicao = {},
): Promise<T> {
  const metodo = opcoes.metodo ?? "GET";
  const token = opcoes.token !== undefined ? opcoes.token : obterToken();

  const headers: Record<string, string> = {};
  if (opcoes.corpo !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let resposta: Response;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      method: metodo,
      headers,
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new ApiError(CODIGO_ERRO_REDE, mensagemDeErro(CODIGO_ERRO_REDE), 0);
  }

  // 204 ou corpo vazio.
  const texto = await resposta.text();
  const dados = texto ? safeJson(texto) : undefined;

  if (!resposta.ok) {
    const erro = (dados as { erro?: { codigo?: string; mensagem?: string } })
      ?.erro;
    const codigo = erro?.codigo ?? "ERRO_INTERNO";
    throw new ApiError(
      codigo,
      mensagemDeErro(codigo, erro?.mensagem),
      resposta.status,
    );
  }

  return dados as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

export const api = {
  get: <T>(caminho: string, token?: string | null) =>
    requisitar<T>(caminho, { metodo: "GET", token }),
  post: <T>(caminho: string, corpo?: unknown, token?: string | null) =>
    requisitar<T>(caminho, { metodo: "POST", corpo, token }),
  put: <T>(caminho: string, corpo?: unknown, token?: string | null) =>
    requisitar<T>(caminho, { metodo: "PUT", corpo, token }),
  del: <T>(caminho: string, corpo?: unknown, token?: string | null) =>
    requisitar<T>(caminho, { metodo: "DELETE", corpo, token }),
};
