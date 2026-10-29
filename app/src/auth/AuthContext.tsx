import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { api, ApiError, registrarProvedorDeToken } from "@/api/client";
import { carregarApiBaseUrlSalva } from "@/config";
import type {
  RespostaLogin,
  RespostaMe,
  RespostaTrocaSenha,
  Usuario,
} from "@/api/tipos";
import { getItem, removeItem, setItem } from "@/storage";

const CHAVE_TOKEN = "focus.token";

interface EstadoAuth {
  // true enquanto a sessao esta sendo reidratada no boot (GET /auth/me).
  reidratando: boolean;
  token: string | null;
  usuario: Usuario | null;
  login: (credencial: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  trocarSenha: (senhaAtual: string, novaSenha: string) => Promise<void>;
}

const AuthContext = createContext<EstadoAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [reidratando, setReidratando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  // Ref sempre atualizada com o token corrente, para o provedor do client.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  useEffect(() => {
    registrarProvedorDeToken(() => tokenRef.current);
  }, []);

  const aplicarSessao = useCallback(
    async (novoToken: string, novoUsuario: Usuario) => {
      await setItem(CHAVE_TOKEN, novoToken);
      setToken(novoToken);
      setUsuario(novoUsuario);
    },
    [],
  );

  const limparSessao = useCallback(async () => {
    await removeItem(CHAVE_TOKEN);
    setToken(null);
    setUsuario(null);
  }, []);

  // Reidratacao no boot: le o token do storage e, se houver, busca o usuario
  // fresco em GET /auth/me. 401 => limpa a sessao.
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        // Carrega a URL base persistida antes de qualquer chamada, para que
        // a reidratacao ja use o endereco definido pelo usuario.
        await carregarApiBaseUrlSalva();
        const salvo = await getItem(CHAVE_TOKEN);
        if (!salvo) {
          return;
        }
        if (ativo) {
          setToken(salvo);
          tokenRef.current = salvo;
        }
        const me = await api.get<RespostaMe>("/auth/me", salvo);
        if (ativo) {
          setUsuario(me.user);
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          await removeItem(CHAVE_TOKEN);
        }
        if (ativo) {
          setToken(null);
          setUsuario(null);
          tokenRef.current = null;
        }
      } finally {
        if (ativo) {
          setReidratando(false);
        }
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const login = useCallback(
    async (credencial: string, senha: string) => {
      const resp = await api.post<RespostaLogin>(
        "/auth/login",
        { credencial, senha },
        null,
      );
      await aplicarSessao(resp.token, resp.user);
    },
    [aplicarSessao],
  );

  const logout = useCallback(async () => {
    const atual = tokenRef.current;
    if (atual) {
      try {
        await api.post("/auth/logout", undefined, atual);
      } catch {
        // no-op no servidor; cliente descarta o token de qualquer forma.
      }
    }
    await limparSessao();
  }, [limparSessao]);

  const trocarSenha = useCallback(
    async (senhaAtual: string, novaSenha: string) => {
      const resp = await api.post<RespostaTrocaSenha>(
        "/auth/change-password",
        { senhaAtual, novaSenha },
        tokenRef.current,
      );
      // Guarda o token reemitido (com mustChangePassword:false).
      await aplicarSessao(resp.token, resp.user);
    },
    [aplicarSessao],
  );

  return (
    <AuthContext.Provider
      value={{ reidratando, token, usuario, login, logout, trocarSenha }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): EstadoAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  }
  return ctx;
}
