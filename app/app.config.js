// Configuracao do app Expo (Focus).
// Injeta a URL base da API em expo.extra.apiBaseUrl a partir de
// process.env.EXPO_PUBLIC_API_BASE_URL, com default http://localhost:3000.
// Para rodar no celular via Expo Go, defina EXPO_PUBLIC_API_BASE_URL com o IP
// da LAN do PC servidor (ex.: http://192.168.0.10:3000) antes de `npx expo start`.

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

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
    },
  },
});
