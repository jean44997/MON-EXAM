import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, type AppConfig } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";
import Logo from "@/src/components/Logo";

const SERIES_ICON: Record<string, any> = {
  generale: "school",
  industrielle: "construct",
  tertiaire: "briefcase",
  litteraire: "library",
  scientifique: "flask",
  technique: "build",
  hotellerie: "restaurant",
  economique: "stats-chart",
};

export default function CatalogScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="catalog-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]} testID="back-btn">
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Logo size="small" countdownTaps showName={false} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>CATALOGUE · {country.toUpperCase()}</Text>
          <Text style={[styles.title, { color: palette.text }]}>Ta série</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />}
        {config && Object.entries(config.series).map(([key, s]) => (
          <TouchableOpacity
            key={key}
            testID={`series-${key}`}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: "/sub-series", params: { series: key } })}
            style={[styles.card, { backgroundColor: palette.surface, borderColor: s.color + "30" }]}
          >
            <View style={[styles.iconBox, { backgroundColor: s.color }]}>
              <Ionicons name={(SERIES_ICON[key] || "school") as any} size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sLabel, { color: palette.text }]}>{s.label}</Text>
              <Text style={[styles.sDesc, { color: palette.textMuted }]}>{s.description}</Text>
              <View style={styles.chips}>
                {s.sub_series.slice(0, 6).map((ss) => (
                  <View key={ss} style={[styles.chip, { backgroundColor: s.color + "15" }]}>
                    <Text style={[styles.chipText, { color: s.color }]}>{ss}</Text>
                  </View>
                ))}
                {s.sub_series.length > 6 && (
                  <View style={[styles.chip, { backgroundColor: s.color + "15" }]}>
                    <Text style={[styles.chipText, { color: s.color }]}>+{s.sub_series.length - 6}</Text>
                  </View>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
          </TouchableOpacity>
        ))}
        <View style={{ height: 40 }} />
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
  list: { padding: 16 },
  card: { borderRadius: 18, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sLabel: { fontSize: 16, fontWeight: "800" },
  sDesc: { fontSize: 12, marginTop: 2 },
  chips: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: "800" },
});
