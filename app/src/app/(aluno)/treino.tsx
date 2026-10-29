import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Exercicio, Ficha } from "@/api/tipos";
import { useAuth } from "@/auth/AuthContext";
import {
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function TreinoScreen() {
  const { usuario } = useAuth();
  const alunoId = usuario?.id;
  const queryClient = useQueryClient();

  const chaveFichas = ["fichas", alunoId];

  const consulta = useQuery({
    enabled: !!alunoId,
    queryKey: chaveFichas,
    queryFn: () => api.get<{ fichas: Ficha[] }>(`/alunos/${alunoId}/fichas`),
  });

  const mutacao = useMutation({
    mutationFn: async (args: {
      exercicioId: number;
      serieNumero: number;
      concluida: boolean;
    }) => {
      const corpo = {
        exercicioId: args.exercicioId,
        serieNumero: args.serieNumero,
      };
      if (args.concluida) {
        await api.del("/completions", corpo);
      } else {
        await api.post("/completions", corpo);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chaveFichas });
    },
  });

  if (consulta.isLoading) {
    return <Carregando texto="Carregando seu treino..." />;
  }

  if (consulta.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro
          texto={
            consulta.error instanceof Error
              ? consulta.error.message
              : "Não foi possível carregar o treino."
          }
        />
      </ScrollView>
    );
  }

  const fichas = consulta.data?.fichas ?? [];
  const ativa = fichas.find((f) => f.ativa);

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Meu treino</Titulo>
      {!ativa ? (
        <Subtitulo>
          Você ainda não tem uma ficha ativa. Fale com seu instrutor.
        </Subtitulo>
      ) : (
        <>
          <Subtitulo>{ativa.titulo}</Subtitulo>
          {ativa.exercicios
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((ex) => (
              <ExercicioCartao
                key={ex.id}
                exercicio={ex}
                aoAlternar={(serieNumero, concluida) =>
                  mutacao.mutate({ exercicioId: ex.id, serieNumero, concluida })
                }
              />
            ))}
        </>
      )}
    </ScrollView>
  );
}

function ExercicioCartao({
  exercicio,
  aoAlternar,
}: {
  exercicio: Exercicio;
  aoAlternar: (serieNumero: number, concluida: boolean) => void;
}) {
  const concluidas = new Set(exercicio.seriesConcluidas);
  const series = Array.from({ length: exercicio.series }, (_, i) => i + 1);

  return (
    <Cartao>
      <Text style={estilos.nomeExercicio}>{exercicio.nome}</Text>
      <Text style={estilos.detalhe}>
        {exercicio.series} séries · {exercicio.repeticoes} repetições
        {exercicio.carga ? ` · ${exercicio.carga}` : ""}
      </Text>
      {exercicio.observacoes ? (
        <Text style={estilos.observacoes}>{exercicio.observacoes}</Text>
      ) : null}

      <View style={estilos.linhaSeries}>
        {series.map((n) => {
          const feita = concluidas.has(n);
          return (
            <Pressable
              key={n}
              onPress={() => aoAlternar(n, feita)}
              style={[estilos.serie, feita && estilos.serieFeita]}
            >
              <Text
                style={[estilos.serieTexto, feita && estilos.serieTextoFeita]}
              >
                {feita ? "✓" : ""} Série {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Cartao>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: 20,
    backgroundColor: cores.fundo,
    flexGrow: 1,
  },
  nomeExercicio: {
    fontSize: 17,
    fontWeight: "700",
    color: cores.texto,
  },
  detalhe: {
    fontSize: 14,
    color: cores.textoSuave,
    marginTop: 4,
  },
  observacoes: {
    fontSize: 13,
    color: cores.textoSuave,
    fontStyle: "italic",
    marginTop: 4,
  },
  linhaSeries: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  serie: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: cores.cartao,
  },
  serieFeita: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  serieTexto: {
    fontSize: 14,
    color: cores.texto,
    fontWeight: "600",
  },
  serieTextoFeita: {
    color: cores.primariaTexto,
  },
});
