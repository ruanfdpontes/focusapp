import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { AlunoResumo, Instrutor, StatusConta } from "@/api/tipos";
import {
  Carregando,
  Cartao,
  cores,
  MensagemErro,
  Subtitulo,
  Titulo,
} from "@/ui/componentes";

const ROTULO_STATUS: Record<StatusConta, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export default function VisaoGeralScreen() {
  // Dono sem ?status recebe todos os alunos.
  const consultaAlunos = useQuery({
    queryKey: ["alunos", "todos"],
    queryFn: () => api.get<{ alunos: AlunoResumo[] }>("/alunos"),
  });

  const consultaInstrutores = useQuery({
    queryKey: ["instrutores"],
    queryFn: () => api.get<{ instrutores: Instrutor[] }>("/instrutores"),
  });

  if (consultaAlunos.isLoading || consultaInstrutores.isLoading) {
    return <Carregando texto="Carregando visão geral..." />;
  }

  if (consultaAlunos.isError || consultaInstrutores.isError) {
    return (
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <MensagemErro texto="Não foi possível carregar a visão geral." />
      </ScrollView>
    );
  }

  const alunos = consultaAlunos.data?.alunos ?? [];
  const instrutores = consultaInstrutores.data?.instrutores ?? [];
  const aprovados = alunos.filter((a) => a.status === "aprovado").length;
  const pendentes = alunos.filter((a) => a.status === "pendente").length;

  return (
    <ScrollView contentContainerStyle={estilos.conteudo}>
      <Titulo>Visão geral</Titulo>

      <View style={estilos.linhaContadores}>
        <Contador rotulo="Alunos" valor={alunos.length} />
        <Contador rotulo="Aprovados" valor={aprovados} />
        <Contador rotulo="Pendentes" valor={pendentes} />
        <Contador rotulo="Instrutores" valor={instrutores.length} />
      </View>

      <Text style={estilos.secao}>Alunos</Text>
      {alunos.length === 0 ? (
        <Subtitulo>Nenhum aluno cadastrado.</Subtitulo>
      ) : (
        alunos.map((a) => (
          <Cartao key={a.id}>
            <Text style={estilos.nome}>{a.nome}</Text>
            <Text style={estilos.detalhe}>
              Matrícula: {a.matricula} · {ROTULO_STATUS[a.status]}
            </Text>
          </Cartao>
        ))
      )}

      <Text style={estilos.secao}>Instrutores</Text>
      {instrutores.length === 0 ? (
        <Subtitulo>Nenhum instrutor cadastrado.</Subtitulo>
      ) : (
        instrutores.map((i) => (
          <Cartao key={i.id}>
            <Text style={estilos.nome}>{i.nome}</Text>
            <Text style={estilos.detalhe}>Login: {i.login}</Text>
          </Cartao>
        ))
      )}
    </ScrollView>
  );
}

function Contador({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View style={estilos.contador}>
      <Text style={estilos.contadorValor}>{valor}</Text>
      <Text style={estilos.contadorRotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  conteudo: {
    padding: 20,
    backgroundColor: cores.fundo,
    flexGrow: 1,
  },
  linhaContadores: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 12,
  },
  contador: {
    flexGrow: 1,
    minWidth: 80,
    backgroundColor: cores.cartao,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.borda,
    padding: 16,
    alignItems: "center",
  },
  contadorValor: {
    fontSize: 28,
    fontWeight: "800",
    color: cores.primaria,
  },
  contadorRotulo: {
    fontSize: 13,
    color: cores.textoSuave,
    marginTop: 4,
  },
  secao: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
    marginTop: 16,
    marginBottom: 8,
  },
  nome: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.texto,
  },
  detalhe: {
    fontSize: 14,
    color: cores.textoSuave,
    marginTop: 4,
  },
});
