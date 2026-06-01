import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { apiGet, apiPost, clearCart, getCountry, getUserId, type AppConfig } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";

export default function PaymentScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { palette, mode } = useTheme();
  const [order, setOrder] = useState<any>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [remaining, setRemaining] = useState<number>(300);
  const [code, setCode] = useState("");
  const [txn, setTxn] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tickRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      setC(c);
      const cfg = await apiGet<AppConfig>(`/config?country=${c}`);
      setConfig(cfg);
      const uid = await getUserId();
      const o = await apiGet(`/order/${orderId}?user_id=${uid}`);
      setOrder(o);
      setRemaining(o.seconds_remaining);
    })();
  }, [orderId]);

  useEffect(() => {
    if (!order) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [order]);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const expired = remaining === 0;

  async function confirm() {
    if (expired) {
      Alert.alert("Expiré", "Le délai est dépassé. Recommencez votre commande.");
      return;
    }
    if (code.trim().length < 4) {
      Alert.alert("Code requis", "Entrez votre code d'activation.");
      return;
    }
    if (txn.trim().length < 3) {
      Alert.alert("Référence manquante", "Entrez la référence de votre paiement.");
      return;
    }
    setSubmitting(true);
    try {
      const uid = await getUserId();
      await apiPost("/payment/simulate", {
        order_id: order.order_id,
        user_id: uid,
        txn_ref: txn,
        activation_code: code.trim().toUpperCase(),
      });
      await clearCart();
      Alert.alert(
        "Paiement soumis",
        "Votre commande est en attente de validation par notre équipe. Vérifiez Mes Achats dans quelques minutes.",
        [{ text: "Voir mes achats", onPress: () => router.replace("/purchases") }],
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Échec");
    } finally {
      setSubmitting(false);
    }
  }

  function openWhatsApp() {
    if (!config || !order) return;
    const msg = encodeURIComponent(
      `Bonjour, je viens de payer (commande ${order.order_id}) sur Mon Exam. Mon code: ${order.activation_code}. Merci de me transmettre l'accès.`,
    );
    Linking.openURL(`${config.whatsapp_link}?text=${msg}`).catch(() => {});
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]}>
        <Text style={[styles.loading, { color: palette.textMuted }]}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="payment-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/services")} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="close" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>PAIEMENT EN ATTENTE</Text>
          <Text style={[styles.title, { color: palette.text }]}>Confirmez sous 5 min</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={expired ? ["#7F1D1D", "#991B1B"] : remaining < 60 ? ["#DC2626", "#EF4444"] : ["#0F172A", "#1E293B"]}
          style={styles.timerBox}
        >
          <Text style={styles.timerLabel}>TEMPS RESTANT</Text>
          <Text style={styles.timerVal} testID="countdown">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </Text>
          {expired && <Text style={styles.timerExpired}>Délai expiré — recommencez votre commande</Text>}
        </LinearGradient>

        <View style={[styles.codeBox, { backgroundColor: palette.surface, borderColor: palette.accent }]}>
          <Text style={[styles.codeLabel, { color: palette.textMuted }]}>VOTRE CODE D'ACTIVATION UNIQUE</Text>
          <Text style={[styles.codeValue, { color: palette.text }]} testID="activation-code">{order.activation_code}</Text>
          <Text style={[styles.codeHint, { color: palette.textMuted }]}>Code à usage unique · lié à votre numéro · expire en 5 min</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>INSTRUCTIONS DE PAIEMENT</Text>
        <View style={[styles.payBox, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.payHeader}>
            <View style={[styles.payIcon, { backgroundColor: order.payment_method === "wave" ? palette.wave : palette.orange }]}>
              <Text style={styles.payIconText}>{order.payment_method === "wave" ? "W" : "OM"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.payTitle, { color: palette.text }]}>{order.payment_method === "wave" ? "Wave" : "Orange Money"}</Text>
              <Text style={[styles.payNumber, { color: palette.textMuted }]}>{order.payment_number}</Text>
            </View>
          </View>
          <View style={[styles.amountRow, { backgroundColor: mode === "dark" ? "#1F2937" : "#F1F5F9" }]}>
            <Text style={[styles.amountLabel, { color: palette.textMuted }]}>Montant à envoyer</Text>
            <Text style={[styles.amountVal, { color: palette.text }]}>{order.amount.toLocaleString("fr-FR")} XOF</Text>
          </View>
          <Text style={[styles.step, { color: palette.text }]}>1. Ouvrez {order.payment_method === "wave" ? "Wave" : "Orange Money"}</Text>
          <Text style={[styles.step, { color: palette.text }]}>2. Envoyez {order.amount.toLocaleString("fr-FR")} XOF au numéro ci-dessus</Text>
          <Text style={[styles.step, { color: palette.text }]}>3. Notez la référence (TXN ID)</Text>
          <Text style={[styles.step, { color: palette.text }]}>4. Saisissez le code et la référence ci-dessous</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>VALIDATION</Text>
        <TextInput
          testID="code-input"
          placeholder="CODE (ex: ABCD1234)"
          placeholderTextColor={palette.textMuted}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        />
        <TextInput
          testID="txn-input"
          placeholder="Référence Wave / OM"
          placeholderTextColor={palette.textMuted}
          value={txn}
          onChangeText={setTxn}
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
        />

        <TouchableOpacity
          testID="confirm-btn"
          activeOpacity={0.85}
          disabled={submitting || expired}
          onPress={confirm}
          style={[styles.confirmBtn, { backgroundColor: expired ? palette.textMuted : theme.primary }]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.confirmText}>{submitting ? "..." : "Confirmer le paiement"}</Text>
        </TouchableOpacity>

        <TouchableOpacity testID="whatsapp-btn" activeOpacity={0.85} onPress={openWhatsApp} style={[styles.waBtn, { backgroundColor: palette.surface }]}>
          <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
          <Text style={styles.waText}>Discuter sur WhatsApp</Text>
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: palette.textMuted }]}>
          Notre équipe valide votre paiement manuellement. L'accès est ensuite débloqué dans "Mes Achats".
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loading: { textAlign: "center", marginTop: 40 },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: "900" },
  body: { padding: 16 },
  timerBox: { padding: 24, borderRadius: 20, alignItems: "center", marginBottom: 16 },
  timerLabel: { color: "#FBBF24", fontWeight: "800", letterSpacing: 3, fontSize: 11 },
  timerVal: { color: "#fff", fontSize: 56, fontWeight: "900", fontFamily: "monospace", marginTop: 4, letterSpacing: 4 },
  timerExpired: { color: "#FECACA", marginTop: 8, fontWeight: "700" },
  codeBox: { padding: 18, borderRadius: 16, alignItems: "center", borderWidth: 2, marginBottom: 16, borderStyle: "dashed" },
  codeLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  codeValue: { fontSize: 32, fontWeight: "900", marginTop: 8, letterSpacing: 4, fontFamily: "monospace" },
  codeHint: { fontSize: 11, marginTop: 8, textAlign: "center" },
  sectionLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 10, marginTop: 6 },
  payBox: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  payHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  payIcon: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  payIconText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  payTitle: { fontWeight: "800", fontSize: 15 },
  payNumber: { fontSize: 13, marginTop: 2 },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 10 },
  amountLabel: { fontWeight: "700", fontSize: 12 },
  amountVal: { fontWeight: "900", fontSize: 18 },
  step: { fontSize: 12, lineHeight: 20 },
  input: { borderRadius: 12, padding: 14, borderWidth: 1, fontSize: 16, marginBottom: 10 },
  confirmBtn: { height: 54, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 },
  confirmText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  waBtn: { marginTop: 10, height: 50, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 2, borderColor: "#25D366" },
  waText: { color: "#25D366", fontWeight: "800", fontSize: 14 },
  disclaimer: { fontSize: 11, marginTop: 16, lineHeight: 16, textAlign: "center" },
});
