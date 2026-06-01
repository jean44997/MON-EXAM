import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { apiGet, apiPost, setCountry, setUserId, type AppConfig } from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";

export default function CountryScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<AppConfig>("/config").then(setConfig).catch(console.warn);
  }, []);

  async function select(code: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost<{ user_id: string }>("/session/init", { country_code: code });
      await setUserId(res.user_id);
      await setCountry(code);
      router.replace("/services");
    } catch (e: any) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} testID="country-screen">
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.hero}>
        <Text style={styles.brand}>Mon Exam</Text>
        <Text style={styles.title}>Choisis ton pays</Text>
        <Text style={styles.subtitle}>
          Nous générons un identifiant unique sécurisé à chaque connexion
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} />}
        {config?.countries.map((c) => {
          const theme = COUNTRY_THEMES[c.code];
          return (
            <TouchableOpacity
              key={c.code}
              testID={`country-${c.code}`}
              activeOpacity={0.85}
              onPress={() => select(c.code)}
              style={styles.card}
            >
              <LinearGradient
                colors={theme.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flag}
              >
                <View style={styles.flagInner}>
                  {c.flag_colors.map((col, i) => (
                    <View key={i} style={[styles.stripe, { backgroundColor: col }]} />
                  ))}
                </View>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.countryName}>{c.name}</Text>
                <Text style={styles.countryHint}>
                  {c.code === "civ" ? "Design complet · BAC ivoirien" : "Design pays disponible"}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: theme.primary }]}>→</Text>
            </TouchableOpacity>
          );
        })}
        {loading && <ActivityIndicator color={THEME.primary} style={{ marginTop: 20 }} />}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  hero: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 28 },
  brand: { color: "#FBBF24", fontSize: 14, fontWeight: "700", letterSpacing: 3, textTransform: "uppercase" },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 12, letterSpacing: -1 },
  subtitle: { color: "#94A3B8", marginTop: 8, fontSize: 14, lineHeight: 20 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 12,
  },
  flag: { width: 60, height: 60, borderRadius: 14, overflow: "hidden", padding: 2 },
  flagInner: { flex: 1, flexDirection: "row", borderRadius: 12, overflow: "hidden" },
  stripe: { flex: 1, height: "100%" },
  countryName: { fontSize: 18, fontWeight: "800", color: THEME.text },
  countryHint: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: "900" },
});
