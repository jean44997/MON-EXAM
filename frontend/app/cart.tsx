import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView, Platform } from "react-native";

import {
  apiGet,
  apiPost,
  getCart,
  setCart,
  getUserId,
  getCountry,
  type AppConfig,
  type CartItem,
} from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";
import { storage } from "@/src/utils/storage";

type Pack = "single" | "pack5" | "exam" | "pack6";

export default function CartScreen() {
  const router = useRouter();
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
      const cfg = await apiGet<AppConfig>("/config");
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
    <SafeAreaView style={styles.safe} testID="cart-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>PANIER</Text>
          <Text style={styles.title}>Validation</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Items */}
          <Text style={styles.sectionLabel}>VOS SUJETS ({items.length})</Text>
          {items.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="cart-outline" size={36} color={THEME.textMuted} />
              <Text style={styles.emptyText}>Aucun sujet dans le panier</Text>
            </View>
          )}
          {items.map((i) => (
            <View key={i.subject_id} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{i.name}</Text>
                <Text style={styles.itemMeta}>Série {i.sub_series}</Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(i.subject_id)} testID={`remove-${i.subject_id}`}>
                <Ionicons name="trash-outline" size={20} color={THEME.danger} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Pack selection */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>OFFRE</Text>
          {[
            { id: "single", title: "Corrigé seul", subtitle: `${config?.pricing.single.toLocaleString("fr-FR")} XOF par sujet` },
            { id: "exam", title: "Sujet + Corrigé", subtitle: `${config?.pricing.exam.toLocaleString("fr-FR")} XOF par sujet` },
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
                pack === p.id && { borderColor: theme.primary, backgroundColor: theme.primary + "08" },
              ]}
            >
              <View style={[styles.radio, pack === p.id && { borderColor: theme.primary, backgroundColor: theme.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>{p.title}</Text>
                <Text style={styles.optionSub}>{p.subtitle}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Phone */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>VOTRE TÉLÉPHONE</Text>
          <TextInput
            testID="phone-input"
            placeholder="+225 07 00 00 00 00"
            placeholderTextColor={THEME.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            style={styles.input}
          />

          {/* Payment method */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>MOYEN DE PAIEMENT</Text>
          <View style={styles.payRow}>
            <TouchableOpacity
              testID="pay-wave"
              activeOpacity={0.85}
              onPress={() => setMethod("wave")}
              style={[
                styles.payCard,
                { borderColor: method === "wave" ? THEME.wave : THEME.border },
              ]}
            >
              <View style={[styles.payDot, { backgroundColor: THEME.wave }]} />
              <Text style={styles.payTitle}>Wave</Text>
              <Text style={styles.payNum}>{config?.wave_number}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="pay-orange"
              activeOpacity={0.85}
              onPress={() => setMethod("orange")}
              style={[
                styles.payCard,
                { borderColor: method === "orange" ? THEME.orange : THEME.border },
              ]}
            >
              <View style={[styles.payDot, { backgroundColor: THEME.orange }]} />
              <Text style={styles.payTitle}>Orange Money</Text>
              <Text style={styles.payNum}>Numéro indisponible</Text>
            </TouchableOpacity>
          </View>

          {/* How it works */}
          <View style={styles.howBox}>
            <Text style={styles.howTitle}>Comment ça marche ?</Text>
            <Text style={styles.howStep}>1. Cliquez sur "Payer" pour générer votre code unique</Text>
            <Text style={styles.howStep}>2. Envoyez le montant exact au numéro Wave indiqué</Text>
            <Text style={styles.howStep}>3. Vous avez 5 minutes pour valider sinon votre commande s'annule</Text>
            <Text style={styles.howStep}>4. Saisissez votre code dans l'application — accès débloqué</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>{amount.toLocaleString("fr-FR")} XOF</Text>
        </View>
        <TouchableOpacity
          testID="pay-btn"
          activeOpacity={0.85}
          disabled={submitting || items.length === 0}
          onPress={payNow}
          style={[
            styles.payBtn,
            { backgroundColor: theme.primary, opacity: submitting || items.length === 0 ? 0.5 : 1 },
          ]}
        >
          <Text style={styles.payBtnText}>{submitting ? "..." : "Payer"}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.border },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: THEME.text, fontSize: 24, fontWeight: "900" },
  list: { padding: 16 },
  sectionLabel: { color: THEME.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 10 },
  empty: { backgroundColor: "#fff", padding: 24, borderRadius: 14, alignItems: "center", gap: 8, borderWidth: 1, borderColor: THEME.border },
  emptyText: { color: THEME.textMuted, fontWeight: "600" },
  itemRow: { backgroundColor: "#fff", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  itemName: { fontWeight: "800", color: THEME.text, fontSize: 14 },
  itemMeta: { color: THEME.textMuted, fontSize: 12, marginTop: 2 },
  option: { backgroundColor: "#fff", padding: 14, borderRadius: 14, borderWidth: 2, borderColor: THEME.border, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: THEME.border },
  optionTitle: { fontWeight: "800", color: THEME.text, fontSize: 14 },
  optionSub: { color: THEME.textMuted, fontSize: 12, marginTop: 2 },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: THEME.border, fontSize: 16, color: THEME.text },
  payRow: { flexDirection: "row", gap: 10 },
  payCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 14, borderWidth: 2 },
  payDot: { width: 14, height: 14, borderRadius: 7, marginBottom: 8 },
  payTitle: { fontWeight: "800", color: THEME.text, fontSize: 14 },
  payNum: { color: THEME.textMuted, fontSize: 11, marginTop: 2 },
  howBox: { backgroundColor: "#0F172A", padding: 16, borderRadius: 14, marginTop: 20 },
  howTitle: { color: "#FBBF24", fontWeight: "900", fontSize: 13, letterSpacing: 1, marginBottom: 10 },
  howStep: { color: "#CBD5E1", fontSize: 12, marginVertical: 3, lineHeight: 18 },
  footer: { padding: 16, backgroundColor: "#fff", borderTopWidth: 1, borderColor: THEME.border, flexDirection: "row", alignItems: "center", gap: 12 },
  totalLabel: { fontSize: 11, fontWeight: "800", color: THEME.textMuted, letterSpacing: 1 },
  totalAmount: { fontSize: 22, fontWeight: "900", color: THEME.text },
  payBtn: { flex: 1, height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  payBtnText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});
