import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { mensagemDeErro } from "@/api/erros";
import type { SolicitacaoConta } from "@/api/tipos";
import {
  Botao,
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

export default function SolicitacoesScreen() {
  const queryClient = useQueryClient();
  const [erro, setErro] = React.useState<string | null>(null);

  const consulta = useQuery({
    queryKey: ["solicitacoes", "pendente"],
    queryFn: () =>
      api.get<{ requests: SolicitacaoConta[] }>(
        "/accounts/requests?status=pendente",
      ),
  });

  const decidir = useMutation({
    mutationFn: (args: { id: number; acao: "approve" | "reject" }) =>
      api.post(`/accounts/requests/${args.id}/${args.acao}`),
    onSuccess: () => {
      setErro(null);
      queryClient.invalidateQueries({ queryKey: ["solicitacoes", "pendente"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
    },
    onError: (e) => {
      const codigo = e instanceof ApiError ? e.codigo : undefined;
      setErro(mensagemDeErro(codigo, e instanceof Error ? e.message : undefined));
    },
  });

  if (consulta.isLoading) {
    return <Carregando texto="Carregando solicitações..." />;
  }

  if (consulta.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro
          texto={
            consulta.error instanceof Error
              ? consulta.error.message
              : "Não foi possível carregar as solicitações."
          }
        />
      </ScrollView>
    );
  }

  const solicitacoes = consulta.data?.requests ?? [];

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Solicitações</Titulo>
      <Subtitulo>Aprovar ou rejeitar pedidos de conta de alunos.</Subtitulo>

      <MensagemErro texto={erro} />

      {solicitacoes.length === 0 ? (
        <Subtitulo>Nenhuma solicitação pendente.</Subtitulo>
      ) : (
        solicitacoes.map((s) => (
          <Cartao key={s.id}>
            <Text style={estilos.nome}>{s.nome}</Text>
            <Text style={estilos.detalhe}>Matrícula: {s.matricula}</Text>
            <View style={estilos.acoes}>
              <Botao
                titulo="Aprovar"
                onPress={() => decidir.mutate({ id: s.id, acao: "approve" })}
                carregando={decidir.isPending}
                style={{ flex: 1, marginTop: 0 }}
              />
              <Botao
                titulo="Rejeitar"
                variante="perigo"
                onPress={() => decidir.mutate({ id: s.id, acao: "reject" })}
                carregando={decidir.isPending}
                style={{ flex: 1, marginTop: 0 }}
              />
            </View>
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
  acoes: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
});
