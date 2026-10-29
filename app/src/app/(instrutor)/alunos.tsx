import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { AlunoResumo } from "@/api/tipos";
import {
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function AlunosScreen() {
  const router = useRouter();

  const consulta = useQuery({
    queryKey: ["alunos", "aprovado"],
    // O servidor forca status='aprovado' para instrutor; a query e so informativa.
    queryFn: () => api.get<{ alunos: AlunoResumo[] }>("/alunos"),
  });

  if (consulta.isLoading) {
    return <Carregando texto="Carregando alunos..." />;
  }

  if (consulta.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro
          texto={
            consulta.error instanceof Error
              ? consulta.error.message
              : "Não foi possível carregar os alunos."
          }
        />
      </ScrollView>
    );
  }

  const alunos = consulta.data?.alunos ?? [];

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Alunos</Titulo>
      <Subtitulo>Toque em um aluno para montar ou editar a ficha.</Subtitulo>

      {alunos.length === 0 ? (
        <Subtitulo>Nenhum aluno aprovado ainda.</Subtitulo>
      ) : (
        alunos.map((aluno) => (
          <Pressable
            key={aluno.id}
            onPress={() => router.push(`/(instrutor)/ficha/${aluno.id}`)}
          >
            <Cartao>
              <Text style={estilos.nome}>{aluno.nome}</Text>
              <Text style={estilos.detalhe}>Matrícula: {aluno.matricula}</Text>
            </Cartao>
          </Pressable>
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
});
