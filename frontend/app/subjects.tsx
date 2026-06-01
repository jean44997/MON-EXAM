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

import {
  apiGet,
  getCart,
  setCart,
  getCountry,
  type AppConfig,
  type CartItem,
} from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";

type Subject = {
  id: string;
  name: string;
  series: string;
  sub_series: string;
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [cart, setLocalCart] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      const cfg = await apiGet<AppConfig>("/config");
      setConfig(cfg);
      const r = await apiGet<{ subjects: Subject[] }>(`/subjects?series=${series}&sub_series=${subSeries}`);
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
    if (exists) {
      next = cart.filter((c) => c.subject_id !== s.id);
    } else {
      next = [
        ...cart,
        { subject_id: s.id, name: s.name, sub_series: s.sub_series, series: s.series },
      ];
    }
    setLocalCart(next);
    await setCart(next);
  }

  return (
    <SafeAreaView style={styles.safe} testID="subjects-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>SÉRIE {subSeries}</Text>
          <Text style={styles.title}>Sujets disponibles</Text>
        </View>
        <View style={styles.cartBadge}>
          <Ionicons name="cart" size={14} color="#fff" />
          <Text style={styles.cartBadgeText}>{cart.length}</Text>
        </View>
      </View>

      {loading && <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {subjects.map((s) => {
          const inCart = !!cart.find((c) => c.subject_id === s.id);
          return (
            <View key={s.id} style={styles.card} testID={`subject-${s.id}`}>
              <View style={styles.imageWrap}>
                <View style={[styles.fakePaper, { backgroundColor: theme.primary + "10" }]}>
                  <Ionicons
                    name={(SUBJECT_ICON[s.icon] || "document-text") as any}
                    size={48}
                    color={theme.primary + "60"}
                  />
                  <Text style={styles.fakeLines}>≡ ≡ ≡ ≡ ≡ ≡{"\n"}≡ ≡ ≡ ≡ ≡{"\n"}≡ ≡ ≡ ≡ ≡ ≡ ≡</Text>
                </View>
                <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill}>
                  <View style={styles.lockOverlay}>
                    <View style={[styles.lockBubble, { backgroundColor: theme.primary }]}>
                      <Ionicons name="lock-closed" size={20} color="#fff" />
                    </View>
                  </View>
                </BlurView>
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>
                    {price.toLocaleString("fr-FR")} XOF
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.subjectName}>{s.name}</Text>
                <Text style={styles.subjectMeta}>
                  BAC {s.year} · {subSeries} · {s.series === "industrielle" ? "Industrielle" : s.series === "tertiaire" ? "Tertiaire" : "Générale"}
                </Text>
                <TouchableOpacity
                  testID={`add-cart-${s.id}`}
                  activeOpacity={0.85}
                  onPress={() => toggleCart(s)}
                  style={[
                    styles.cartBtn,
                    { backgroundColor: inCart ? "#0F172A" : theme.primary },
                  ]}
                >
                  <Ionicons
                    name={inCart ? "checkmark-circle" : "add-circle"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.cartBtnText}>
                    {inCart ? "Retirer du panier" : "Ajouter au panier"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollView>

      {cart.length > 0 && (
        <TouchableOpacity
          testID="goto-cart-btn"
          activeOpacity={0.9}
          onPress={() => router.push("/cart")}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.fabText}>
            Voir le panier ({cart.length}) · {(cart.length * price).toLocaleString("fr-FR")} XOF
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.border },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: THEME.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  cartBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#0F172A", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  cartBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  list: { padding: 16, gap: 14 },
  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  imageWrap: { height: 160, position: "relative" },
  fakePaper: { flex: 1, alignItems: "center", justifyContent: "center" },
  fakeLines: { color: THEME.textMuted, fontSize: 10, letterSpacing: 4, marginTop: 8, textAlign: "center" },
  lockOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  lockBubble: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  priceTag: { position: "absolute", top: 10, right: 10, backgroundColor: "#0F172A", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  priceTagText: { color: "#FBBF24", fontWeight: "900", fontSize: 12, letterSpacing: 1 },
  cardBody: { padding: 14 },
  subjectName: { fontSize: 17, fontWeight: "800", color: THEME.text },
  subjectMeta: { fontSize: 12, color: THEME.textMuted, marginTop: 4 },
  cartBtn: { marginTop: 12, height: 44, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  cartBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  fab: { position: "absolute", left: 16, right: 16, bottom: 20, height: 56, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  fabText: { color: "#fff", fontWeight: "800", fontSize: 13, flex: 1, textAlign: "center" },
});
