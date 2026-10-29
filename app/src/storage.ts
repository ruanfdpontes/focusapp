import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Wrapper de armazenamento do token de sessao.
// No nativo usa expo-secure-store; no web usa localStorage.
// A API e assincrona para unificar as duas plataformas.

const isWeb = Platform.OS === "web";

export async function getItem(chave: string): Promise<string | null> {
  if (isWeb) {
    try {
      return globalThis.localStorage?.getItem(chave) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(chave);
}

export async function setItem(chave: string, valor: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.setItem(chave, valor);
    } catch {
      // ignora falha de storage no web (ex.: modo privado)
    }
    return;
  }
  await SecureStore.setItemAsync(chave, valor);
}

export async function removeItem(chave: string): Promise<void> {
  if (isWeb) {
    try {
      globalThis.localStorage?.removeItem(chave);
    } catch {
      // ignora
    }
    return;
  }
  await SecureStore.deleteItemAsync(chave);
}
