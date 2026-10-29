import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { mensagemDeErro } from "@/api/erros";
import {
  Botao,
  Campo,
  Cartao,
  cores,
  MensagemErro,
  MensagemSucesso,
  Rotulo,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function SolicitarContaScreen() {
  const router = useRouter();
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function enviar() {
    setErro(null);
    setSucesso(null);
    if (!matricula.trim() || !nome.trim() || !senha) {
      setErro("Preencha matrícula, nome e senha.");
      return;
    }
    setCarregando(true);
    try {
      await api.post(
        "/accounts/requests",
        { matricula: matricula.trim(), nome: nome.trim(), senha },
        null,
      );
      setSucesso("Solicitação enviada! Aguarde a aprovação do dono.");
      setMatricula("");
      setNome("");
      setSenha("");
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
          <Titulo>Solicitar conta</Titulo>
          <Subtitulo>
            Informe seus dados. A conta será liberada após aprovação do dono.
          </Subtitulo>

          <Cartao>
            <Rotulo>Matrícula</Rotulo>
            <Campo
              value={matricula}
              onChangeText={setMatricula}
              placeholder="Ex.: 2024003"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Rotulo>Nome</Rotulo>
            <Campo
              value={nome}
              onChangeText={setNome}
              placeholder="Seu nome completo"
            />

            <Rotulo>Senha</Rotulo>
            <Campo
              value={senha}
              onChangeText={setSenha}
              placeholder="Mínimo de 6 caracteres"
              secureTextEntry
              autoCapitalize="none"
            />

            <MensagemErro texto={erro} />
            <MensagemSucesso texto={sucesso} />

            <Botao
              titulo="Enviar solicitação"
              onPress={enviar}
              carregando={carregando}
            />
            <Botao
              titulo="Voltar para o login"
              variante="secundaria"
              onPress={() => router.replace("/login")}
            />
          </Cartao>

          <Link href="/login" style={{ marginTop: 8 }}>
            <Rotulo>Já tenho conta</Rotulo>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
