import Constants from "expo-constants";
import { getItem } from "@/storage";

// Chave usada no storage para persistir a URL base definida pelo usuario.
export const CHAVE_API_BASE_URL = "focus.apiBaseUrl";

// Fallback de build: valor congelado no bundle. Prioriza a variavel de
// ambiente EXPO_PUBLIC_API_BASE_URL (embutida pelo Expo), depois o valor
// injetado em app.config.js (expo.extra.apiBaseUrl) e, por fim, o default
// de desenvolvimento localhost. Equivale ao antigo API_BASE_URL.
const FALLBACK_BUILD: string = normalizarApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
      ?.apiBaseUrl ??
    "http://localhost:3000",
);

// URL base vigente, mantida em memoria. Inicia com o fallback de build para
// que o primeiro render (antes de o storage carregar) nunca quebre, e e
// atualizada por definirApiBaseUrl() / carregarApiBaseUrlSalva().
let apiBaseUrlAtual: string = FALLBACK_BUILD;

// Getter sincrono lido pelo client a cada requisicao. Nunca retorna vazio.
export function obterApiBaseUrl(): string {
  return apiBaseUrlAtual;
}

// Define a URL base vigente em memoria (ja normalizada). Nao persiste.
export function definirApiBaseUrl(url: string): void {
  apiBaseUrlAtual = normalizarApiBaseUrl(url);
}

// Carrega a URL salva pelo usuario no storage e, se valida, a torna vigente.
// Chamado no boot (AuthProvider), espelhando a reidratacao da sessao.
export async function carregarApiBaseUrlSalva(): Promise<void> {
  const salvo = await getItem(CHAVE_API_BASE_URL);
  if (salvo && urlValida(salvo)) {
    definirApiBaseUrl(salvo);
  }
}

// Normaliza a URL: remove espacos nas pontas e barra(s) finais, de modo que
// `${base}/auth/login` nunca duplique a barra.
export function normalizarApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

// Valida que a URL comeca com http:// ou https:// e tem host.
export function urlValida(url: string): boolean {
  const limpa = url.trim();
  if (!/^https?:\/\//i.test(limpa)) {
    return false;
  }
  try {
    const u = new URL(limpa);
    return !!u.hostname;
  } catch {
    return false;
  }
}
