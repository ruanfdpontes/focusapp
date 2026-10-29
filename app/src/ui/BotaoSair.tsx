import React from "react";
import { Pressable, Text } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { cores } from "@/ui/componentes";

// Botao "Sair" usado no cabecalho das abas de cada grupo por papel.
export function BotaoSair() {
  const { logout } = useAuth();
  return (
    <Pressable onPress={logout} style={{ paddingHorizontal: 12 }}>
      <Text style={{ color: cores.primaria, fontWeight: "600", fontSize: 15 }}>
        Sair
      </Text>
    </Pressable>
  );
}
