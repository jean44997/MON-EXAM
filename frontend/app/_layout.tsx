import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ThemeProvider, useTheme } from "@/src/theme-context";

SplashScreen.preventAutoHideAsync();

function StatusBarThemed() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarThemed />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 280,
            gestureEnabled: true,
            contentStyle: { backgroundColor: "#0B1220" },
          }}
        >
          <Stack.Screen name="index" options={{ animation: "fade", animationDuration: 400 }} />
          <Stack.Screen name="country" options={{ animation: "fade_from_bottom", animationDuration: 350 }} />
          <Stack.Screen name="services" options={{ animation: "fade_from_bottom", animationDuration: 320 }} />
          <Stack.Screen name="payment" options={{ animation: "slide_from_bottom", animationDuration: 350 }} />
          <Stack.Screen name="admin-login" options={{ animation: "slide_from_bottom", animationDuration: 280, presentation: "modal" }} />
          <Stack.Screen name="admin-panel" options={{ animation: "fade", animationDuration: 250 }} />
          <Stack.Screen name="cart" options={{ animation: "slide_from_bottom", animationDuration: 320 }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
