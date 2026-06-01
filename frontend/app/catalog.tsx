import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, type AppConfig } from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";

const SERIES_DESC: Record<string, string> = {
  generale: "Bac littéraire et scientifique · A1, A2, C, D, E",
  industrielle: "Bac technique industriel · F1 à F8",
  tertiaire: "Bac gestion / tertiaire · G1, G2, G3",
};

const SERIES_ICON: Record<string, any> = {
  generale: "school",
  industrielle: "construct",
  tertiaire: "briefcase",
};

export default function CatalogScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={styles.safe} testID="catalog-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} testID="back-btn">
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.crumb}>CATALOGUE</Text>
          <Text style={styles.title}>Choisis ta série</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} />}
        {config &&
          Object.entries(config.series).map(([key, s]) => (
            <TouchableOpacity
              key={key}
              testID={`series-${key}`}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/sub-series", params: { series: key } })}
              style={[styles.card, { borderColor: s.color + "30" }]}
            >
              <View style={[styles.iconBox, { backgroundColor: s.color }]}>
                <Ionicons name={SERIES_ICON[key] as any} size={26} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sLabel}>{s.label}</Text>
                <Text style={styles.sDesc}>{SERIES_DESC[key] || s.description}</Text>
                <View style={styles.chips}>
                  {s.sub_series.slice(0, 5).map((ss) => (
                    <View key={ss} style={[styles.chip, { backgroundColor: s.color + "15" }]}>
                      <Text style={[styles.chipText, { color: s.color }]}>{ss}</Text>
                    </View>
                  ))}
                  {s.sub_series.length > 5 && (
                    <View style={[styles.chip, { backgroundColor: s.color + "15" }]}>
                      <Text style={[styles.chipText, { color: s.color }]}>
                        +{s.sub_series.length - 5}
                      </Text>
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
  crumb: { color: THEME.primary, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: THEME.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  sLabel: { fontSize: 16, fontWeight: "800", color: THEME.text },
  sDesc: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  chips: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: "800" },
});
