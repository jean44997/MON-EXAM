import { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { getUserId, getCountry } from "@/src/api";
import { THEME } from "@/src/theme";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      const country = await getCountry();
      // Always regenerate session at start for security — clear stored id
      // but keep country preference
      setTimeout(() => {
        if (country && uid) {
          router.replace("/services");
        } else {
          router.replace("/country");
        }
      }, 900);
    })();
  }, [router]);

  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.container} testID="splash-screen">
      <View style={styles.logoBox}>
        <Text style={styles.brand}>Mon Exam</Text>
        <Text style={styles.tag}>Réussite garantie · BAC 2026</Text>
      </View>
      <ActivityIndicator color={THEME.primary} size="small" style={{ marginTop: 32 }} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoBox: { alignItems: "center" },
  brand: { color: "#fff", fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  tag: { color: "#FBBF24", marginTop: 8, fontWeight: "600", letterSpacing: 2, fontSize: 12 },
});
