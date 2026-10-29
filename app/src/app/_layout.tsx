import React from "react";
import { Redirect, Slot, usePathname } from "expo-router";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { Carregando } from "@/ui/componentes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Rota inicial de cada grupo por papel.
const DESTINO_POR_PAPEL = {
  aluno: "/(aluno)/treino",
  instrutor: "/(instrutor)/alunos",
  dono: "/(dono)/solicitacoes",
} as const;

// Rotas publicas, acessiveis sem sessao.
const ROTAS_PUBLICAS = ["/login", "/solicitar-conta", "/servidor"];

// UNICO guard de rota do app (design §2.9). Decide o destino por
// precedencia: reidratando -> spinner; sem sessao -> /login;
// mustChangePassword (por FLAG, qualquer papel) -> /trocar-senha;
// senao roteia pelo grupo do papel.
function Guard() {
  const { reidratando, token, usuario } = useAuth();
  const caminho = usePathname();

  if (reidratando) {
    return <Carregando />;
  }

  const temSessao = !!token && !!usuario;

  // Sem sessao: so pode ficar em rotas publicas.
  if (!temSessao) {
    if (!ROTAS_PUBLICAS.includes(caminho)) {
      return <Redirect href="/login" />;
    }
    return <Slot />;
  }

  // Com sessao e troca de senha obrigatoria: unico destino e /trocar-senha.
  if (usuario.mustChangePassword) {
    if (caminho !== "/trocar-senha") {
      return <Redirect href="/trocar-senha" />;
    }
    return <Slot />;
  }

  // Com sessao normal: nao deve ficar em rotas publicas nem na troca de senha.
  const rotasDeEntrada = [...ROTAS_PUBLICAS, "/trocar-senha", "/"];
  if (rotasDeEntrada.includes(caminho)) {
    return <Redirect href={DESTINO_POR_PAPEL[usuario.role]} />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <Guard />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
