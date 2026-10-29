import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";

// Pequena biblioteca de componentes compartilhados, toda em pt-BR,
// para manter a aparencia consistente entre as telas da demo.

export const cores = {
  fundo: "#f5f6f8",
  cartao: "#ffffff",
  texto: "#1a1a1a",
  textoSuave: "#666666",
  primaria: "#2563eb",
  primariaTexto: "#ffffff",
  borda: "#d9dde3",
  erroFundo: "#fde8e8",
  erroTexto: "#b42318",
  sucessoFundo: "#e7f6ec",
  sucessoTexto: "#1a7f37",
  perigo: "#b42318",
};

export function Titulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Subtitulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.subtitulo}>{children}</Text>;
}

export function Rotulo({ children }: { children: React.ReactNode }) {
  return <Text style={estilos.rotulo}>{children}</Text>;
}

export function Campo(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={cores.textoSuave}
      {...props}
      style={[estilos.campo, props.style]}
    />
  );
}

interface BotaoProps {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  desabilitado?: boolean;
  variante?: "primaria" | "secundaria" | "perigo";
  style?: ViewStyle;
}

export function Botao({
  titulo,
  onPress,
  carregando,
  desabilitado,
  variante = "primaria",
  style,
}: BotaoProps) {
  const inativo = carregando || desabilitado;
  const corFundo =
    variante === "primaria"
      ? cores.primaria
      : variante === "perigo"
        ? cores.perigo
        : cores.cartao;
  const corTexto =
    variante === "secundaria" ? cores.primaria : cores.primariaTexto;
  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      style={[
        estilos.botao,
        {
          backgroundColor: corFundo,
          borderWidth: variante === "secundaria" ? 1 : 0,
          borderColor: cores.primaria,
          opacity: inativo ? 0.6 : 1,
        },
        style,
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={corTexto} />
      ) : (
        <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function MensagemErro({ texto }: { texto?: string | null }) {
  if (!texto) {
    return null;
  }
  return (
    <View style={estilos.erroCaixa}>
      <Text style={estilos.erroTexto}>{texto}</Text>
    </View>
  );
}

export function MensagemSucesso({ texto }: { texto?: string | null }) {
  if (!texto) {
    return null;
  }
  return (
    <View style={estilos.sucessoCaixa}>
      <Text style={estilos.sucessoTexto}>{texto}</Text>
    </View>
  );
}

export function Cartao({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function Carregando({ texto = "Carregando..." }: { texto?: string }) {
  return (
    <View style={estilos.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
      <Text style={estilos.carregandoTexto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: {
    fontSize: 24,
    fontWeight: "700",
    color: cores.texto,
    marginBottom: 4,
  },
  subtitulo: {
    fontSize: 15,
    color: cores.textoSuave,
    marginBottom: 16,
  },
  rotulo: {
    fontSize: 14,
    fontWeight: "600",
    color: cores.texto,
    marginBottom: 6,
    marginTop: 12,
  },
  campo: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: cores.texto,
    backgroundColor: cores.cartao,
  },
  botao: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
  },
  botaoTexto: {
    fontSize: 16,
    fontWeight: "600",
  },
  erroCaixa: {
    backgroundColor: cores.erroFundo,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  erroTexto: {
    color: cores.erroTexto,
    fontSize: 14,
  },
  sucessoCaixa: {
    backgroundColor: cores.sucessoFundo,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  sucessoTexto: {
    color: cores.sucessoTexto,
    fontSize: 14,
  },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.fundo,
    gap: 12,
  },
  carregandoTexto: {
    color: cores.textoSuave,
    fontSize: 15,
  },
});
