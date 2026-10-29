import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import { ApiError } from "@/api/client";
import { mensagemDeErro } from "@/api/erros";
import {
  Botao,
  Campo,
  Cartao,
  cores,
  MensagemErro,
  Rotulo,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function LoginScreen() {
  const { login } = useAuth();
  const [credencial, setCredencial] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro(null);
    if (!credencial.trim() || !senha) {
      setErro("Informe a credencial e a senha.");
      return;
    }
    setCarregando(true);
    try {
      await login(credencial.trim(), senha);
      // O guard em _layout.tsx cuida do redirecionamento.
    } catch (e) {
      const codigo = e instanceof ApiError ? e.codigo : undefined;
      setErro(mensagemDeErro(codigo, e instanceof Error ? e.message : undefined));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: cores.fundo }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: "center" }}
      >
        <View style={{ maxWidth: 460, width: "100%", alignSelf: "center" }}>
          <Titulo>Focus</Titulo>
          <Subtitulo>Entre com sua credencial e senha.</Subtitulo>

          <Cartao>
            <Rotulo>Credencial (matrícula ou login)</Rotulo>
            <Campo
              value={credencial}
              onChangeText={setCredencial}
              placeholder="Ex.: 2024001 ou dono"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Rotulo>Senha</Rotulo>
            <Campo
              value={senha}
              onChangeText={setSenha}
              placeholder="Sua senha"
              secureTextEntry
              autoCapitalize="none"
            />

            <MensagemErro texto={erro} />

            <Botao titulo="Entrar" onPress={entrar} carregando={carregando} />
          </Cartao>

          <Link href="/solicitar-conta" style={{ marginTop: 8 }}>
            <Rotulo>Solicitar conta de aluno</Rotulo>
          </Link>

          <Link href="/servidor" style={{ marginTop: 8 }}>
            <Rotulo>Endereço do servidor</Rotulo>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
