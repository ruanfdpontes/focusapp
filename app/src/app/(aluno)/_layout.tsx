import React from "react";
import { Tabs } from "expo-router";
import { BotaoSair } from "@/ui/BotaoSair";
import { cores } from "@/ui/componentes";

export default function LayoutAluno() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <BotaoSair />,
        tabBarActiveTintColor: cores.primaria,
      }}
    >
      <Tabs.Screen name="treino" options={{ title: "Meu treino" }} />
      <Tabs.Screen name="progresso" options={{ title: "Progresso" }} />
    </Tabs>
  );
}
