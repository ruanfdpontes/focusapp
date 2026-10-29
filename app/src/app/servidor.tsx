import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CHAVE_API_BASE_URL,
  definirApiBaseUrl,
  normalizarApiBaseUrl,
  obterApiBaseUrl,
  urlValida,
} from "@/config";
import { setItem } from "@/storage";
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

export default function ServidorScreen() {
  const router = useRouter();
  const [url, setUrl] = useState(() => obterApiBaseUrl());
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);

  async function salvar() {
    setErro(null);
    setSucesso(null);
    if (!urlValida(url)) {
      setErro("Informe uma URL válida iniciando com http:// ou https://.");
      return;
    }
    setSalvando(true);
    try {
      const normalizada = normalizarApiBaseUrl(url);
      await setItem(CHAVE_API_BASE_URL, normalizada);
      definirApiBaseUrl(normalizada);
      setUrl(normalizada);
      setSucesso("Endereço salvo.");
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    setErro(null);
    setSucesso(null);
    if (!urlValida(url)) {
      setErro("Informe uma URL válida iniciando com http:// ou https://.");
      return;
    }
    setTestando(true);
    try {
      const alvo = `${normalizarApiBaseUrl(url)}/health`;
      const resposta = await fetch(alvo);
      const dados = (await resposta.json()) as { ok?: boolean };
      if (resposta.ok && dados?.ok === true) {
        setSucesso("Conexão bem-sucedida com o servidor.");
      } else {
        setErro(
          "Não foi possível conectar. Verifique a URL e se o servidor está ligado.",
        );
      }
    } catch {
      setErro(
        "Não foi possível conectar. Verifique a URL e se o servidor está ligado.",
      );
    } finally {
      setTestando(false);
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
          <Titulo>Endereço do servidor</Titulo>
          <Subtitulo>
            Define onde o app encontra o servidor da academia na rede.
          </Subtitulo>

          <Cartao>
            <Rotulo>URL do servidor</Rotulo>
            <Campo
              value={url}
              onChangeText={setUrl}
              placeholder="http://192.168.0.10:3000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <MensagemErro texto={erro} />
            <MensagemSucesso texto={sucesso} />

            <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
            <Botao
              titulo="Testar conexão"
              variante="secundaria"
              onPress={testar}
              carregando={testando}
            />
            <Botao
              titulo="Voltar para o login"
              variante="secundaria"
              onPress={() => router.replace("/login")}
            />
          </Cartao>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
