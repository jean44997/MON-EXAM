import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import {
  apiGet,
  getCart,
  setCart,
  getCountry,
  type AppConfig,
  type CartItem,
} from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";

type Subject = {
  id: string;
  name: string;
  series: string;
  sub_series: string;
  country: string;
  icon: string;
  description: string;
  year: string;
};

const SUBJECT_ICON: Record<string, any> = {
  calculator: "calculator",
  atom: "flask",
  leaf: "leaf",
  book: "book",
  brain: "library",
  globe: "globe",
  language: "language",
  bolt: "flash",
  gear: "cog",
  plug: "battery-charging",
  wrench: "construct",
  chart: "stats-chart",
  scale: "scale",
};

export default function SubjectsScreen() {
  const router = useRouter();
  const { series, subSeries } = useLocalSearchParams<{ series: string; subSeries: string }>();
  const { palette, mode } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cart, setLocalCart] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      const cfg = await apiGet<AppConfig>(`/config?country=${c}`);
      setConfig(cfg);
      const r = await apiGet<{ subjects: Subject[] }>(`/subjects?series=${series}&sub_series=${subSeries}&country=${c}`);
      setSubjects(r.subjects);
      const cur = await getCart();
      setLocalCart(cur);
      setLoading(false);
    })();
  }, [series, subSeries]);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;
  const price = config?.pricing.single || 8000;

  async function toggleCart(s: Subject) {
    const exists = cart.find((c) => c.subject_id === s.id);
    let next: CartItem[];
    if (exists) next = cart.filter((c) => c.subject_id !== s.id);
    else next = [...cart, { subject_id: s.id, name: s.name, sub_series: s.sub_series, series: s.series, country: s.country }];
    setLocalCart(next);
    await setCart(next);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="subjects-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>SÉRIE {subSeries}</Text>
          <Text style={[styles.title, { color: palette.text }]}>Sujets disponibles</Text>
        </View>
        <View style={[styles.cartBadge, { backgroundColor: theme.primary }]}>
          <Ionicons name="cart" size={14} color="#fff" />
          <Text style={styles.cartBadgeText}>{cart.length}</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {subjects.map((s) => {
          const inCart = !!cart.find((c) => c.subject_id === s.id);
          return (
            <View key={s.id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={`subject-${s.id}`}>
              <View style={styles.imageWrap}>
                <LinearGradient colors={[theme.primary + "20", theme.secondary + "15"]} style={styles.fakePaper}>
                  <View style={styles.paperTop}>
                    <Text style={styles.paperHeader}>RÉPUBLIQUE · BAC {s.year}</Text>
                    <Text style={styles.paperSeries}>SÉRIE {s.sub_series}</Text>
                  </View>
                  <Ionicons name={(SUBJECT_ICON[s.icon] || "document-text") as any} size={42} color={theme.primary + "70"} />
                  <Text style={styles.paperTitle}>{s.name.toUpperCase()}</Text>
                  <View style={styles.paperLines}>
                    {[1, 2, 3, 4].map((i) => (
                      <View key={i} style={[styles.line, { width: `${85 - i * 8}%` }]} />
                    ))}
                  </View>
                </LinearGradient>
                <BlurView intensity={45} tint={mode === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill}>
                  <View style={styles.lockOverlay}>
                    <View style={[styles.lockBubble, { backgroundColor: theme.primary }]}>
                      <Ionicons name="lock-closed" size={22} color="#fff" />
                    </View>
                    <Text style={styles.lockHint}>Débloquer après paiement</Text>
                  </View>
                </BlurView>
                <View style={[styles.priceTag, { backgroundColor: "#0F172A" }]}>
                  <Text style={styles.priceTagText}>{price.toLocaleString("fr-FR")} XOF</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.subjectName, { color: palette.text }]}>{s.name}</Text>
                <Text style={[styles.subjectMeta, { color: palette.textMuted }]}>
                  BAC {s.year} · {s.sub_series} · {s.country?.toUpperCase()}
                </Text>
                <TouchableOpacity
                  testID={`add-cart-${s.id}`}
                  activeOpacity={0.85}
                  onPress={() => toggleCart(s)}
                  style={[styles.cartBtn, { backgroundColor: inCart ? "#0F172A" : theme.primary }]}
                >
                  <Ionicons name={inCart ? "checkmark-circle" : "add-circle"} size={18} color="#fff" />
                  <Text style={styles.cartBtnText}>{inCart ? "Retirer du panier" : "Ajouter au panier"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {cart.length > 0 && (
        <TouchableOpacity testID="goto-cart-btn" activeOpacity={0.9} onPress={() => router.push("/cart")} style={[styles.fab, { backgroundColor: theme.primary }]}>
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.fabText}>
            Panier ({cart.length}) · {(cart.length * price).toLocaleString("fr-FR")} XOF
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  cartBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  cartBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  list: { padding: 16 },
  card: { borderRadius: 18, overflow: "hidden", borderWidth: 1, marginBottom: 12 },
  imageWrap: { height: 200, position: "relative" },
  fakePaper: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  paperTop: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" },
  paperHeader: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#0F172A99" },
  paperSeries: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#0F172A99" },
  paperTitle: { fontSize: 13, fontWeight: "900", color: "#0F172A99", marginTop: 8, letterSpacing: 1, textAlign: "center" },
  paperLines: { width: "100%", marginTop: 12, gap: 4 },
  line: { height: 4, backgroundColor: "#0F172A20", borderRadius: 2 },
  lockOverlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  lockBubble: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  lockHint: { color: "#0F172A", fontWeight: "800", fontSize: 11, letterSpacing: 1 },
  priceTag: { position: "absolute", top: 10, right: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  priceTagText: { color: "#FBBF24", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  cardBody: { padding: 14 },
  subjectName: { fontSize: 17, fontWeight: "800" },
  subjectMeta: { fontSize: 12, marginTop: 4 },
  cartBtn: { marginTop: 12, height: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  cartBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  fab: { position: "absolute", left: 16, right: 16, bottom: 20, height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 13, flex: 1, textAlign: "center" },
});
