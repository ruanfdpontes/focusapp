import React, { useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { mensagemDeErro } from "@/api/erros";
import type { Instrutor } from "@/api/tipos";
import {
  Botao,
  Campo,
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  MensagemSucesso,
  Rotulo,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function InstrutoresScreen() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senhaPadrao, setSenhaPadrao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["instrutores"],
    queryFn: () => api.get<{ instrutores: Instrutor[] }>("/instrutores"),
  });

  const cadastrar = useMutation({
    mutationFn: () =>
      api.post("/instrutores", {
        nome: nome.trim(),
        login: login.trim(),
        senhaPadrao,
      }),
    onSuccess: () => {
      setErro(null);
      setSucesso("Instrutor cadastrado. Ele trocará a senha no primeiro acesso.");
      setNome("");
      setLogin("");
      setSenhaPadrao("");
      queryClient.invalidateQueries({ queryKey: ["instrutores"] });
    },
    onError: (e) => {
      setSucesso(null);
      const codigo = e instanceof ApiError ? e.codigo : undefined;
      setErro(mensagemDeErro(codigo, e instanceof Error ? e.message : undefined));
    },
  });

  function aoCadastrar() {
    setErro(null);
    setSucesso(null);
    if (!nome.trim() || !login.trim() || !senhaPadrao) {
      setErro("Preencha nome, login e senha padrão.");
      return;
    }
    cadastrar.mutate();
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Instrutores</Titulo>
      <Subtitulo>Cadastre instrutores e veja os já existentes.</Subtitulo>

      <Cartao>
        <Text style={estilos.secao}>Cadastrar instrutor</Text>
        <Rotulo>Nome</Rotulo>
        <Campo value={nome} onChangeText={setNome} placeholder="Nome do instrutor" />

        <Rotulo>Login</Rotulo>
        <Campo
          value={login}
          onChangeText={setLogin}
          placeholder="Ex.: joao.silva"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Rotulo>Senha padrão</Rotulo>
        <Campo
          value={senhaPadrao}
          onChangeText={setSenhaPadrao}
          placeholder="Mínimo de 6 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />

        <MensagemErro texto={erro} />
        <MensagemSucesso texto={sucesso} />

        <Botao
          titulo="Cadastrar instrutor"
          onPress={aoCadastrar}
          carregando={cadastrar.isPending}
        />
      </Cartao>

      <Text style={estilos.secao}>Instrutores cadastrados</Text>
      {consulta.isLoading ? (
        <Carregando texto="Carregando..." />
      ) : consulta.isError ? (
        <MensagemErro
          texto={
            consulta.error instanceof Error
              ? consulta.error.message
              : "Não foi possível carregar os instrutores."
          }
        />
      ) : (consulta.data?.instrutores ?? []).length === 0 ? (
        <Subtitulo>Nenhum instrutor cadastrado ainda.</Subtitulo>
      ) : (
        consulta.data!.instrutores.map((i) => (
          <Cartao key={i.id}>
            <Text style={estilos.nome}>{i.nome}</Text>
            <Text style={estilos.detalhe}>Login: {i.login}</Text>
            {i.mustChangePassword ? (
              <Text style={estilos.pendente}>Ainda não trocou a senha</Text>
            ) : null}
          </Cartao>
        ))
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: 20,
    backgroundColor: cores.fundo,
    flexGrow: 1,
  },
  secao: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
    marginTop: 8,
    marginBottom: 8,
  },
  nome: {
    fontSize: 17,
    fontWeight: "700",
    color: cores.texto,
  },
  detalhe: {
    fontSize: 14,
    color: cores.textoSuave,
    marginTop: 4,
  },
  pendente: {
    fontSize: 13,
    color: cores.erroTexto,
    marginTop: 4,
  },
});
