import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, apiPost, getCart, setCart, getUserId, getCountry, type AppConfig, type CartItem } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";
import { storage } from "@/src/utils/storage";

type Pack = "single" | "pack5" | "exam" | "pack6";

export default function CartScreen() {
  const router = useRouter();
  const { palette, mode } = useTheme();
  const [items, setItems] = useState<CartItem[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [pack, setPack] = useState<Pack>("single");
  const [method, setMethod] = useState<"wave" | "orange">("wave");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState<string>("realtime");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      const cfg = await apiGet<AppConfig>(`/config?country=${c}`);
      setConfig(cfg);
      const cart = await getCart();
      setItems(cart);
      const svc = await storage.getItem<string>("selected_service", "realtime");
      if (svc) setService(svc);
    })();
  }, []);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;

  function computeAmount(): number {
    if (!config) return 0;
    const n = items.length;
    if (pack === "single") return config.pricing.single * n;
    if (pack === "exam") return config.pricing.exam * n;
    if (pack === "pack5") return config.pricing.pack5;
    if (pack === "pack6") return config.pricing.pack6;
    return 0;
  }

  async function removeItem(id: string) {
    const next = items.filter((i) => i.subject_id !== id);
    setItems(next);
    await setCart(next);
  }

  async function payNow() {
    if (items.length === 0) {
      Alert.alert("Panier vide", "Ajoute au moins un sujet pour continuer.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 8) {
      Alert.alert("Numéro requis", "Entre ton numéro de téléphone valide.");
      return;
    }
    setSubmitting(true);
    try {
      const uid = await getUserId();
      const res = await apiPost("/checkout", {
        user_id: uid,
        phone,
        items: items.map((i) => ({ subject_id: i.subject_id, sub_series: i.sub_series })),
        service,
        payment_method: method,
        pack,
        country_code: country,
      });
      router.replace({ pathname: "/payment", params: { orderId: res.order_id } });
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Échec de la création de la commande");
    } finally {
      setSubmitting(false);
    }
  }

  const amount = computeAmount();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="cart-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>PANIER</Text>
          <Text style={[styles.title, { color: palette.text }]}>Validation</Text>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>VOS SUJETS ({items.length})</Text>
          {items.length === 0 && (
            <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="cart-outline" size={36} color={palette.textMuted} />
              <Text style={[styles.emptyText, { color: palette.textMuted }]}>Aucun sujet dans le panier</Text>
            </View>
          )}
          {items.map((i) => (
            <View key={i.subject_id} style={[styles.itemRow, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: palette.text }]}>{i.name}</Text>
                <Text style={[styles.itemMeta, { color: palette.textMuted }]}>Série {i.sub_series}</Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(i.subject_id)} testID={`remove-${i.subject_id}`}>
                <Ionicons name="trash-outline" size={20} color={palette.danger} />
              </TouchableOpacity>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { color: palette.textMuted, marginTop: 20 }]}>OFFRE</Text>
          {[
            { id: "single", title: "Corrigé seul", subtitle: `${config?.pricing.single.toLocaleString("fr-FR")} XOF / sujet` },
            { id: "exam", title: "Sujet + Corrigé", subtitle: `${config?.pricing.exam.toLocaleString("fr-FR")} XOF / sujet` },
            { id: "pack5", title: "Pack 5 corrigés", subtitle: `${config?.pricing.pack5.toLocaleString("fr-FR")} XOF forfait` },
            { id: "pack6", title: "Pack 6 sujets + corrigés", subtitle: `${config?.pricing.pack6.toLocaleString("fr-FR")} XOF forfait` },
          ].map((p) => (
            <TouchableOpacity
              key={p.id}
              testID={`pack-${p.id}`}
              activeOpacity={0.85}
              onPress={() => setPack(p.id as Pack)}
              style={[
                styles.option,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pack === p.id && { borderColor: theme.primary, backgroundColor: theme.primary + (mode === "dark" ? "20" : "08") },
              ]}
            >
              <View style={[styles.radio, { borderColor: palette.border }, pack === p.id && { borderColor: theme.primary, backgroundColor: theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: palette.text }]}>{p.title}</Text>
                <Text style={[styles.optionSub, { color: palette.textMuted }]}>{p.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionLabel, { color: palette.textMuted, marginTop: 20 }]}>VOTRE TÉLÉPHONE</Text>
          <TextInput
            testID="phone-input"
            placeholder="+225 07 00 00 00 00"
            placeholderTextColor={palette.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          />

          <Text style={[styles.sectionLabel, { color: palette.textMuted, marginTop: 20 }]}>MOYEN DE PAIEMENT</Text>
          <View style={styles.payRow}>
            <TouchableOpacity
              testID="pay-wave"
              activeOpacity={0.85}
              onPress={() => setMethod("wave")}
              style={[styles.payCard, { backgroundColor: palette.surface, borderColor: method === "wave" ? palette.wave : palette.border }]}
            >
              <View style={[styles.payDot, { backgroundColor: palette.wave }]} />
              <Text style={[styles.payTitle, { color: palette.text }]}>Wave</Text>
              <Text style={[styles.payNum, { color: palette.textMuted }]}>{config?.wave_number}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="pay-orange"
              activeOpacity={0.85}
              onPress={() => setMethod("orange")}
              style={[styles.payCard, { backgroundColor: palette.surface, borderColor: method === "orange" ? palette.orange : palette.border }]}
            >
              <View style={[styles.payDot, { backgroundColor: palette.orange }]} />
              <Text style={[styles.payTitle, { color: palette.text }]}>Orange Money</Text>
              <Text style={[styles.payNum, { color: palette.textMuted }]}>{config?.orange_number}</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.howBox, { backgroundColor: mode === "dark" ? "#1F2937" : "#0F172A" }]}>
            <Text style={styles.howTitle}>Comment ça marche ?</Text>
            <Text style={styles.howStep}>1. Cliquez sur "Payer" pour générer votre code unique</Text>
            <Text style={styles.howStep}>2. Envoyez le montant exact au numéro sélectionné</Text>
            <Text style={styles.howStep}>3. Vous avez 5 minutes sinon la commande s'annule</Text>
            <Text style={styles.howStep}>4. Saisissez le code et la référence pour validation</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View>
          <Text style={[styles.totalLabel, { color: palette.textMuted }]}>TOTAL</Text>
          <Text style={[styles.totalAmount, { color: palette.text }]}>{amount.toLocaleString("fr-FR")} XOF</Text>
        </View>
        <TouchableOpacity
          testID="pay-btn"
          activeOpacity={0.85}
          disabled={submitting || items.length === 0}
          onPress={payNow}
          style={[styles.payBtn, { backgroundColor: theme.primary, opacity: submitting || items.length === 0 ? 0.5 : 1 }]}
        >
          <Text style={styles.payBtnText}>{submitting ? "..." : "Payer"}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "900" },
  list: { padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 10 },
  empty: { padding: 24, borderRadius: 14, alignItems: "center", gap: 8, borderWidth: 1 },
  emptyText: { fontWeight: "600" },
  itemRow: { padding: 14, borderRadius: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  itemName: { fontWeight: "800", fontSize: 14 },
  itemMeta: { fontSize: 12, marginTop: 2 },
  option: { padding: 14, borderRadius: 14, borderWidth: 2, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  optionTitle: { fontWeight: "800", fontSize: 14 },
  optionSub: { fontSize: 12, marginTop: 2 },
  input: { borderRadius: 12, padding: 14, borderWidth: 1, fontSize: 16 },
  payRow: { flexDirection: "row", gap: 10 },
  payCard: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 2 },
  payDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 8 },
  payTitle: { fontWeight: "800", fontSize: 14 },
  payNum: { fontSize: 11, marginTop: 2 },
  howBox: { padding: 16, borderRadius: 14, marginTop: 20 },
  howTitle: { color: "#FBBF24", fontWeight: "900", fontSize: 13, letterSpacing: 1, marginBottom: 10 },
  howStep: { color: "#CBD5E1", fontSize: 12, marginVertical: 3, lineHeight: 18 },
  footer: { padding: 16, borderTopWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  totalLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  totalAmount: { fontSize: 22, fontWeight: "900" },
  payBtn: { flex: 1, height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  payBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
