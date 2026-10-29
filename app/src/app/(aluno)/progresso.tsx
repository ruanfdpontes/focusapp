import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Exercicio, Ficha, Progresso } from "@/api/tipos";
import { useAuth } from "@/auth/AuthContext";
import {
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function ProgressoScreen() {
  const { usuario } = useAuth();
  const alunoId = usuario?.id;

  const consultaFichas = useQuery({
    enabled: !!alunoId,
    queryKey: ["fichas", alunoId],
    queryFn: () => api.get<{ fichas: Ficha[] }>(`/alunos/${alunoId}/fichas`),
  });

  const ativa = consultaFichas.data?.fichas.find((f) => f.ativa);

  const consultaProgresso = useQuery({
    enabled: !!alunoId && !!ativa,
    queryKey: ["progresso", alunoId, ativa?.id],
    queryFn: () =>
      api.get<Progresso>(`/alunos/${alunoId}/fichas/${ativa!.id}/progresso`),
  });

  if (consultaFichas.isLoading) {
    return <Carregando texto="Carregando progresso..." />;
  }

  if (consultaFichas.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro
          texto={
            consultaFichas.error instanceof Error
              ? consultaFichas.error.message
              : "Não foi possível carregar o progresso."
          }
        />
      </ScrollView>
    );
  }

  if (!ativa) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Titulo>Progresso</Titulo>
        <Subtitulo>Você ainda não tem uma ficha ativa.</Subtitulo>
      </ScrollView>
    );
  }

  const progresso = consultaProgresso.data;
  const mapaExercicios = new Map<number, Exercicio>(
    ativa.exercicios.map((e) => [e.id, e]),
  );

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Progresso</Titulo>
      <Subtitulo>{ativa.titulo}</Subtitulo>

      {consultaProgresso.isLoading || !progresso ? (
        <Carregando texto="Calculando..." />
      ) : (
        <>
          <Cartao>
            <Text style={estilos.percentualGeral}>{progresso.percentual}%</Text>
            <Text style={estilos.detalhe}>
              {progresso.totalConcluidas} de {progresso.totalSeries} séries
              concluídas
            </Text>
          </Cartao>

          {progresso.exercicios.map((ex) => {
            const info = mapaExercicios.get(ex.exercicioId);
            const pct =
              ex.series > 0 ? Math.round((100 * ex.concluidas) / ex.series) : 0;
            return (
              <Cartao key={ex.exercicioId}>
                <Text style={estilos.nomeExercicio}>
                  {info?.nome ?? `Exercício ${ex.exercicioId}`}
                </Text>
                <View style={estilos.barraFundo}>
                  <View style={[estilos.barraPreenchida, { width: `${pct}%` }]} />
                </View>
                <Text style={estilos.detalhe}>
                  {ex.concluidas} de {ex.series} séries ({pct}%)
                </Text>
              </Cartao>
            );
          })}
        </>
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
  percentualGeral: {
    fontSize: 36,
    fontWeight: "800",
    color: cores.primaria,
  },
  nomeExercicio: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
    marginBottom: 8,
  },
  detalhe: {
    fontSize: 14,
    color: cores.textoSuave,
    marginTop: 4,
  },
  barraFundo: {
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.borda,
    overflow: "hidden",
  },
  barraPreenchida: {
    height: 10,
    borderRadius: 5,
    backgroundColor: cores.primaria,
  },
});
