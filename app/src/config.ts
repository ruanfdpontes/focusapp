import Constants from "expo-constants";

// URL base da API. Prioriza a variavel de ambiente EXPO_PUBLIC_API_BASE_URL
// (embutida no bundle pelo Expo), depois o valor injetado em app.config.js
// (expo.extra.apiBaseUrl) e, por fim, o default de desenvolvimento localhost.
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)
    ?.apiBaseUrl ??
  "http://localhost:3000";
