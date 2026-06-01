import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { apiGet, apiPost, setCountry, setUserId, type AppConfig } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";
import Logo from "@/src/components/Logo";

export default function CountryScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    apiGet<AppConfig>("/config").then((cfg) => {
      setConfig(cfg);
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }).catch(console.warn);
  }, [fade]);

  async function select(code: string) {
    if (loading) return;
    setLoading(true);
    try {
      const res = await apiPost<{ user_id: string }>("/session/init", { country_code: code });
      await setUserId(res.user_id);
      await setCountry(code);
      router.replace("/services");
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="country-screen">
      <LinearGradient colors={["#0B1220", "#1E293B"]} style={styles.hero}>
        <Logo size="medium" showName={false} testID="splash-logo" />
        <Text style={styles.title}>Choisis ton pays</Text>
        <Text style={styles.subtitle}>
          Nous générons un identifiant unique sécurisé à chaque connexion. Aucun mot de passe requis.
        </Text>
      </LinearGradient>

      <Animated.ScrollView style={{ opacity: fade }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />}
        {config?.countries.map((c, i) => {
          const theme = COUNTRY_THEMES[c.code];
          return (
            <TouchableOpacity
              key={c.code}
              testID={`country-${c.code}`}
              activeOpacity={0.85}
              onPress={() => select(c.code)}
              style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <LinearGradient
                colors={theme.gradient as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.flag}
              >
                <View style={styles.flagInner}>
                  {c.flag_colors.map((col, idx) => (
                    <View key={idx} style={[styles.stripe, { backgroundColor: col }]} />
                  ))}
                </View>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.countryName, { color: palette.text }]}>{c.name}</Text>
                <Text style={[styles.countryHint, { color: palette.textMuted }]}>
                  {c.code === "civ" ? "Design complet · BAC ivoirien" : "Séries authentiques disponibles"}
                </Text>
              </View>
              <Text style={[styles.arrow, { color: theme.primary }]}>→</Text>
            </TouchableOpacity>
          );
        })}
        {loading && <ActivityIndicator color={palette.primary} style={{ marginTop: 20 }} />}
        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
  title: { color: "#fff", fontSize: 32, fontWeight: "900", marginTop: 18, letterSpacing: -1 },
  subtitle: { color: "#94A3B8", marginTop: 8, fontSize: 14, lineHeight: 20 },
  list: { padding: 16 },
  card: { borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, marginBottom: 12 },
  flag: { width: 60, height: 60, borderRadius: 14, overflow: "hidden", padding: 2 },
  flagInner: { flex: 1, flexDirection: "row", borderRadius: 12, overflow: "hidden" },
  stripe: { flex: 1, height: "100%" },
  countryName: { fontSize: 18, fontWeight: "800" },
  countryHint: { fontSize: 12, marginTop: 2 },
  arrow: { fontSize: 24, fontWeight: "900" },
});
