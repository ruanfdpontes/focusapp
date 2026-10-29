import React, { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { mensagemDeErro } from "@/api/erros";
import type { ExercicioPayload, Ficha } from "@/api/tipos";
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

// Linha de exercicio em edicao. id presente = exercicio ja existente no banco
// (sera reconciliado por id no PUT, preservando o progresso).
interface LinhaExercicio {
  id?: number;
  nome: string;
  series: string;
  repeticoes: string;
  carga: string;
  observacoes: string;
}

function linhaVazia(): LinhaExercicio {
  return { nome: "", series: "3", repeticoes: "10", carga: "", observacoes: "" };
}

export default function FichaScreen() {
  const params = useLocalSearchParams<{ alunoId: string }>();
  const alunoId = Number(params.alunoId);
  const queryClient = useQueryClient();

  const [titulo, setTitulo] = useState("");
  const [linhas, setLinhas] = useState<LinhaExercicio[]>([]);
  const [fichaId, setFichaId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const consulta = useQuery({
    enabled: Number.isInteger(alunoId) && alunoId > 0,
    queryKey: ["fichas", alunoId],
    queryFn: () => api.get<{ fichas: Ficha[] }>(`/alunos/${alunoId}/fichas`),
  });

  // Carrega a ficha ativa (se houver) no estado editavel.
  useEffect(() => {
    const ativa = consulta.data?.fichas.find((f) => f.ativa);
    if (ativa) {
      setFichaId(ativa.id);
      setTitulo(ativa.titulo);
      setLinhas(
        ativa.exercicios
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((e) => ({
            id: e.id,
            nome: e.nome,
            series: String(e.series),
            repeticoes: e.repeticoes,
            carga: e.carga ?? "",
            observacoes: e.observacoes ?? "",
          })),
      );
    } else if (consulta.data) {
      setFichaId(null);
      setTitulo("");
      setLinhas([linhaVazia()]);
    }
  }, [consulta.data]);

  const salvar = useMutation({
    mutationFn: async () => {
      const exercicios: ExercicioPayload[] = linhas.map((l, indice) => ({
        id: l.id,
        nome: l.nome.trim(),
        series: Number(l.series),
        repeticoes: l.repeticoes.trim(),
        carga: l.carga.trim() ? l.carga.trim() : null,
        observacoes: l.observacoes.trim() ? l.observacoes.trim() : null,
        ordem: indice,
      }));

      if (fichaId === null) {
        // Nova ficha.
        await api.post(`/alunos/${alunoId}/fichas`, {
          titulo: titulo.trim(),
          ativa: true,
          exercicios,
        });
      } else {
        // Atualiza titulo e reconcilia exercicios por id.
        await api.put(`/fichas/${fichaId}`, { titulo: titulo.trim() });
        await api.put(`/fichas/${fichaId}/exercicios`, { exercicios });
      }
    },
    onSuccess: () => {
      setErro(null);
      setSucesso("Ficha salva com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["fichas", alunoId] });
    },
    onError: (e) => {
      setSucesso(null);
      const codigo = e instanceof ApiError ? e.codigo : undefined;
      setErro(mensagemDeErro(codigo, e instanceof Error ? e.message : undefined));
    },
  });

  function aoSalvar() {
    setErro(null);
    setSucesso(null);
    if (!titulo.trim()) {
      setErro("Informe um título para a ficha.");
      return;
    }
    if (linhas.length === 0) {
      setErro("Adicione pelo menos um exercício.");
      return;
    }
    for (const l of linhas) {
      if (!l.nome.trim()) {
        setErro("Todos os exercícios precisam de um nome.");
        return;
      }
      const s = Number(l.series);
      if (!Number.isInteger(s) || s < 1 || s > 20) {
        setErro("Séries deve ser um número inteiro entre 1 e 20.");
        return;
      }
      if (!l.repeticoes.trim()) {
        setErro("Informe as repetições de cada exercício.");
        return;
      }
    }
    salvar.mutate();
  }

  function atualizarLinha(indice: number, campo: keyof LinhaExercicio, valor: string) {
    setLinhas((atual) =>
      atual.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)),
    );
  }

  function removerLinha(indice: number) {
    setLinhas((atual) => atual.filter((_, i) => i !== indice));
  }

  function moverLinha(indice: number, direcao: -1 | 1) {
    setLinhas((atual) => {
      const alvo = indice + direcao;
      if (alvo < 0 || alvo >= atual.length) {
        return atual;
      }
      const copia = atual.slice();
      const [item] = copia.splice(indice, 1);
      copia.splice(alvo, 0, item);
      return copia;
    });
  }

  if (consulta.isLoading) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Subtitulo>Carregando ficha...</Subtitulo>
      </ScrollView>
    );
  }

  if (consulta.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro
          texto={
            consulta.error instanceof Error
              ? consulta.error.message
              : "Não foi possível carregar a ficha."
          }
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Ficha de treino</Titulo>
      <Subtitulo>
        {fichaId === null
          ? "Este aluno ainda não tem ficha ativa. Crie uma abaixo."
          : "Edite o título e os exercícios da ficha ativa."}
      </Subtitulo>

      <Cartao>
        <Rotulo>Título da ficha</Rotulo>
        <Campo
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex.: Treino A — Full Body"
        />
      </Cartao>

      <Text style={estilos.aviso}>
        Atenção: excluir um exercício apaga o progresso registrado dele.
      </Text>

      {linhas.map((linha, indice) => (
        <Cartao key={linha.id ?? `novo-${indice}`}>
          <View style={estilos.cabecalhoLinha}>
            <Text style={estilos.numeroExercicio}>Exercício {indice + 1}</Text>
            <View style={estilos.acoesLinha}>
              <Pressable
                onPress={() => moverLinha(indice, -1)}
                style={estilos.botaoMini}
              >
                <Text style={estilos.botaoMiniTexto}>↑</Text>
              </Pressable>
              <Pressable
                onPress={() => moverLinha(indice, 1)}
                style={estilos.botaoMini}
              >
                <Text style={estilos.botaoMiniTexto}>↓</Text>
              </Pressable>
              <Pressable
                onPress={() => removerLinha(indice)}
                style={[estilos.botaoMini, estilos.botaoRemover]}
              >
                <Text style={[estilos.botaoMiniTexto, { color: cores.primariaTexto }]}>
                  Remover
                </Text>
              </Pressable>
            </View>
          </View>

          <Rotulo>Nome</Rotulo>
          <Campo
            value={linha.nome}
            onChangeText={(v) => atualizarLinha(indice, "nome", v)}
            placeholder="Ex.: Supino reto"
          />

          <View style={estilos.duasColunas}>
            <View style={estilos.coluna}>
              <Rotulo>Séries</Rotulo>
              <Campo
                value={linha.series}
                onChangeText={(v) => atualizarLinha(indice, "series", v)}
                keyboardType="number-pad"
                placeholder="4"
              />
            </View>
            <View style={estilos.coluna}>
              <Rotulo>Repetições</Rotulo>
              <Campo
                value={linha.repeticoes}
                onChangeText={(v) => atualizarLinha(indice, "repeticoes", v)}
                placeholder="8-12"
              />
            </View>
          </View>

          <Rotulo>Carga (opcional)</Rotulo>
          <Campo
            value={linha.carga}
            onChangeText={(v) => atualizarLinha(indice, "carga", v)}
            placeholder="Ex.: 20kg"
          />

          <Rotulo>Observações (opcional)</Rotulo>
          <Campo
            value={linha.observacoes}
            onChangeText={(v) => atualizarLinha(indice, "observacoes", v)}
            placeholder="Ex.: cadência lenta"
            multiline
          />
        </Cartao>
      ))}

      <Botao
        titulo="Adicionar exercício"
        variante="secundaria"
        onPress={() => setLinhas((atual) => [...atual, linhaVazia()])}
      />

      <MensagemErro texto={erro} />
      <MensagemSucesso texto={sucesso} />

      <Botao titulo="Salvar ficha" onPress={aoSalvar} carregando={salvar.isPending} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: 20,
    backgroundColor: cores.fundo,
    flexGrow: 1,
  },
  aviso: {
    fontSize: 13,
    color: cores.erroTexto,
    marginBottom: 8,
  },
  cabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  numeroExercicio: {
    fontSize: 15,
    fontWeight: "700",
    color: cores.texto,
  },
  acoesLinha: {
    flexDirection: "row",
    gap: 6,
  },
  botaoMini: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: cores.cartao,
  },
  botaoRemover: {
    backgroundColor: cores.perigo,
    borderColor: cores.perigo,
  },
  botaoMiniTexto: {
    fontSize: 14,
    fontWeight: "600",
    color: cores.texto,
  },
  duasColunas: {
    flexDirection: "row",
    gap: 12,
  },
  coluna: {
    flex: 1,
  },
});
