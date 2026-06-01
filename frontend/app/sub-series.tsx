import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, type AppConfig } from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";

const SUB_SERIES_INFO: Record<string, { label: string; desc: string }> = {
  A1: { label: "A1", desc: "Lettres & Philosophie" },
  A2: { label: "A2", desc: "Lettres & Langues" },
  C: { label: "C", desc: "Maths & Sciences Physiques" },
  D: { label: "D", desc: "Maths & Sciences Naturelles" },
  E: { label: "E", desc: "Maths & Technique" },
  F1: { label: "F1", desc: "Construction mécanique" },
  F2: { label: "F2", desc: "Électronique" },
  F3: { label: "F3", desc: "Électrotechnique" },
  F4: { label: "F4", desc: "Génie civil" },
  F5: { label: "F5", desc: "Chimie" },
  F6: { label: "F6", desc: "Chimie de laboratoire" },
  F7: { label: "F7", desc: "Biochimie" },
  F8: { label: "F8", desc: "Sciences médico-sociales" },
  G1: { label: "G1", desc: "Techniques administratives" },
  G2: { label: "G2", desc: "Techniques quantitatives de gestion" },
  G3: { label: "G3", desc: "Techniques commerciales" },
};

export default function SubSeriesScreen() {
  const router = useRouter();
  const { series } = useLocalSearchParams<{ series: string }>();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      apiGet<AppConfig>("/config").then(setConfig).catch(console.warn);
    })();
  }, []);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;
  const seriesData = config?.series[series || ""];

  return (
    <SafeAreaView style={styles.safe} testID="sub-series-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: seriesData?.color || theme.primary }]}>
            {seriesData?.label || ""}
          </Text>
          <Text style={styles.title}>Filière exacte</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Sélectionne ta filière pour accéder aux sujets et corrigés dédiés.
      </Text>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {seriesData?.sub_series.map((ss) => {
          const info = SUB_SERIES_INFO[ss] || { label: ss, desc: "Filière" };
          return (
            <TouchableOpacity
              key={ss}
              testID={`sub-series-${ss}`}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/subjects",
                  params: { series, subSeries: ss },
                })
              }
              style={[styles.tile, { borderColor: (seriesData?.color || theme.primary) + "30" }]}
            >
              <View style={[styles.badge, { backgroundColor: seriesData?.color || theme.primary }]}>
                <Text style={styles.badgeText}>{info.label}</Text>
              </View>
              <Text style={styles.tileDesc}>{info.desc}</Text>
              <Text style={[styles.tileCta, { color: seriesData?.color || theme.primary }]}>
                Voir les sujets →
              </Text>
            </TouchableOpacity>
          );
        })}
        <View style={{ height: 40, width: "100%" }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: THEME.border,
  },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: THEME.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { paddingHorizontal: 20, color: THEME.textMuted, marginTop: 8, marginBottom: 12, fontSize: 13 },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  badge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
  tileDesc: { fontSize: 12, color: THEME.text, marginTop: 10, fontWeight: "600", lineHeight: 16 },
  tileCta: { fontSize: 12, fontWeight: "800", marginTop: 10 },
});
