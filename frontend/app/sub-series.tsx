import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, type AppConfig } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";

const SUB_SERIES_INFO: Record<string, { desc: string }> = {
  A1: { desc: "Lettres & Philo" },
  A2: { desc: "Lettres & Langues" },
  A4: { desc: "Lettres & Maths" },
  C: { desc: "Maths & Sciences Physiques" },
  D: { desc: "Maths & Sciences Naturelles" },
  E: { desc: "Maths & Technique" },
  F1: { desc: "Construction mécanique" },
  F2: { desc: "Électronique" },
  F3: { desc: "Électrotechnique" },
  F4: { desc: "Génie civil" },
  F5: { desc: "Chimie" },
  F6: { desc: "Chimie laboratoire" },
  F7: { desc: "Biochimie" },
  F8: { desc: "Sciences médico-sociales" },
  G1: { desc: "Techniques administratives" },
  G2: { desc: "Techniques de gestion" },
  G3: { desc: "Techniques commerciales" },
  G: { desc: "Gestion" },
  H1: { desc: "Hôtellerie restauration" },
  H2: { desc: "Hôtellerie hébergement" },
  L1a: { desc: "Littéraire option langues" },
  L1b: { desc: "Littéraire option lettres" },
  L2: { desc: "Littéraire arabe" },
  "L'1": { desc: "Littéraire spécial" },
  "L'2": { desc: "Littéraire spécial 2" },
  S1: { desc: "Maths & Sciences" },
  S2: { desc: "Sciences expérimentales" },
  S2A: { desc: "Sciences agronomiques" },
  S3: { desc: "Sciences techniques" },
  S4: { desc: "Mathématiques pures" },
  S5: { desc: "Sciences économiques" },
  T1: { desc: "Technique fabrication" },
  T2: { desc: "Technique maintenance" },
  TAL: { desc: "Arts & Lettres" },
  TLL: { desc: "Lettres-Langues" },
  TSE: { desc: "Sciences Exactes" },
  TSExp: { desc: "Sciences Expérimentales" },
  TSL: { desc: "Sciences & Lettres" },
  TSEco: { desc: "Sciences Économiques" },
  TSS: { desc: "Sciences Sociales" },
};

export default function SubSeriesScreen() {
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series: string }>();
  const { palette } = useTheme();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      apiGet<AppConfig>(`/config?country=${c}`).then(setConfig).catch(console.warn);
    })();
  }, []);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;
  const seriesData = config?.series[series || ""];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="sub-series-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: seriesData?.color || theme.primary }]}>{seriesData?.label || ""}</Text>
          <Text style={[styles.title, { color: palette.text }]}>Filière exacte</Text>
        </View>
      </View>

      <Text style={[styles.subtitle, { color: palette.textMuted }]}>
        Sélectionne ta filière pour accéder aux sujets et corrigés dédiés.
      </Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {seriesData?.sub_series.map((ss) => {
          const info = SUB_SERIES_INFO[ss] || { desc: "Filière" };
          return (
            <TouchableOpacity
              key={ss}
              testID={`sub-series-${ss}`}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/subjects", params: { series, subSeries: ss } })}
              style={[styles.tile, { backgroundColor: palette.surface, borderColor: (seriesData?.color || theme.primary) + "30" }]}
            >
              <View style={[styles.badge, { backgroundColor: seriesData?.color || theme.primary }]}>
                <Text style={styles.badgeText}>{ss}</Text>
              </View>
              <Text style={[styles.tileDesc, { color: palette.text }]}>{info.desc}</Text>
              <Text style={[styles.tileCta, { color: seriesData?.color || theme.primary }]}>Voir les sujets →</Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40, width: "100%" }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { paddingHorizontal: 20, marginTop: 8, marginBottom: 12, fontSize: 13 },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tile: { width: "48%", borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 14, letterSpacing: 0.5 },
  tileDesc: { fontSize: 12, marginTop: 10, fontWeight: "600", lineHeight: 16, minHeight: 32 },
  tileCta: { fontSize: 12, fontWeight: "800", marginTop: 10 },
});
