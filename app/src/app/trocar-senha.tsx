import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
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

export default function TrocarSenhaScreen() {
  const { trocarSenha, logout } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!senhaAtual || !novaSenha || !confirmar) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }
    setCarregando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      // O guard em _layout.tsx redireciona pelo papel apos a flag zerar.
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
          <Titulo>Trocar senha</Titulo>
          <Subtitulo>
            No primeiro acesso é obrigatório definir uma nova senha.
          </Subtitulo>

          <Cartao>
            <Rotulo>Senha atual</Rotulo>
            <Campo
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              placeholder="Senha atual"
              secureTextEntry
              autoCapitalize="none"
            />

            <Rotulo>Nova senha</Rotulo>
            <Campo
              value={novaSenha}
              onChangeText={setNovaSenha}
              placeholder="Mínimo de 6 caracteres"
              secureTextEntry
              autoCapitalize="none"
            />

            <Rotulo>Confirmar nova senha</Rotulo>
            <Campo
              value={confirmar}
              onChangeText={setConfirmar}
              placeholder="Repita a nova senha"
              secureTextEntry
              autoCapitalize="none"
            />

            <MensagemErro texto={erro} />

            <Botao titulo="Salvar nova senha" onPress={salvar} carregando={carregando} />
            <Botao titulo="Sair" variante="secundaria" onPress={logout} />
          </Cartao>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
