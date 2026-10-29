import React from "react";
import { Stack } from "expo-router";
import { BotaoSair } from "@/ui/BotaoSair";

export default function LayoutInstrutor() {
  return (
    <Stack
      screenOptions={{
        headerRight: () => <BotaoSair />,
      }}
    >
      <Stack.Screen name="alunos" options={{ title: "Alunos" }} />
      <Stack.Screen name="ficha/[alunoId]" options={{ title: "Ficha de treino" }} />
    </Stack>
  );
}
