// Configuracao do app Expo (Focus).
// Injeta a URL base da API em expo.extra.apiBaseUrl a partir de
// process.env.EXPO_PUBLIC_API_BASE_URL, com default no servidor hospedado no
// Render. Assim o app ja vem apontando para a nuvem, sem configuracao manual.
// Para apontar para outro servidor (ex.: um backend local em LAN), defina
// EXPO_PUBLIC_API_BASE_URL (ex.: http://192.168.0.10:3000) antes do build/start,
// ou use a tela "Endereco do servidor" dentro do app (override em runtime).

const SERVIDOR_PADRAO = "https://focusapp-tawg.onrender.com";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? SERVIDOR_PADRAO;

module.exports = () => ({
  expo: {
    name: "Focus",
    slug: "focus",
    scheme: "focus",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      package: "com.focus.app",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: ["expo-router", "expo-secure-store"],
    extra: {
      apiBaseUrl,
      eas: {
        projectId: "95a2c37e-7d26-465a-9fec-35eeb622b0bc",
      },
    },
  },
});
