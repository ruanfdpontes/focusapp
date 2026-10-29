import React from "react";
import { Tabs } from "expo-router";
import { BotaoSair } from "@/ui/BotaoSair";
import { cores } from "@/ui/componentes";

export default function LayoutDono() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <BotaoSair />,
        tabBarActiveTintColor: cores.primaria,
      }}
    >
      <Tabs.Screen name="solicitacoes" options={{ title: "Solicitações" }} />
      <Tabs.Screen name="instrutores" options={{ title: "Instrutores" }} />
      <Tabs.Screen name="visao-geral" options={{ title: "Visão geral" }} />
    </Tabs>
  );
}
