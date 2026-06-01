import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, getUserId } from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  paid: { text: "Débloqué", color: THEME.success },
  awaiting_validation: { text: "En attente de validation", color: THEME.warning },
  pending: { text: "Paiement en attente", color: "#64748B" },
  expired: { text: "Expiré", color: THEME.danger },
};

export default function PurchasesScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [country, setC] = useState<string>("civ");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const uid = await getUserId();
    if (!uid) return;
    const c = (await getCountry()) || "civ";
    setC(c);
    const r = await apiGet<{ purchases: any[] }>(`/purchases?user_id=${uid}`);
    setOrders(r.purchases || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;

  function openWhatsApp(o: any) {
    const msg = encodeURIComponent(
      `Bonjour, commande ${o.order_id} validée sur Mon Exam. Code: ${o.activation_code}. Merci de m'envoyer les corrigés.`,
    );
    Linking.openURL(`https://wa.me/2250545019493?text=${msg}`).catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} testID="purchases-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>MES ACHATS</Text>
          <Text style={styles.title}>Historique</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={theme.primary}
          />
        }
      >
        {orders.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={THEME.textMuted} />
            <Text style={styles.emptyTitle}>Aucun achat</Text>
            <Text style={styles.emptyText}>
              Vos commandes et corrigés débloqués apparaitront ici.
            </Text>
            <TouchableOpacity
              testID="goto-catalog"
              activeOpacity={0.85}
              onPress={() => router.replace("/catalog")}
              style={[styles.cta, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.ctaText}>Parcourir le catalogue</Text>
            </TouchableOpacity>
          </View>
        )}

        {orders.map((o) => {
          const st = STATUS_LABEL[o.status] || { text: o.status, color: "#64748B" };
          const unlocked = o.status === "paid";
          return (
            <View key={o.order_id} style={styles.card} testID={`order-${o.order_id}`}>
              <View style={styles.cardHead}>
                <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                <Text style={styles.orderId}>{o.order_id}</Text>
              </View>
              <View style={styles.itemsRow}>
                {o.items.map((it: any, idx: number) => (
                  <View key={idx} style={styles.itemTag}>
                    <Ionicons name={unlocked ? "lock-open" : "lock-closed"} size={11} color={unlocked ? THEME.success : THEME.textMuted} />
                    <Text style={styles.itemTagText}>{it.subject_id.split("-").slice(1).join(" ")}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.amount}>{o.amount.toLocaleString("fr-FR")} XOF</Text>
                  <Text style={styles.svc}>{o.service} · {o.pack}</Text>
                </View>
                <TouchableOpacity
                  testID={`wa-${o.order_id}`}
                  onPress={() => openWhatsApp(o)}
                  style={styles.waBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                  <Text style={styles.waText}>Contact</Text>
                </TouchableOpacity>
              </View>
              {unlocked && (
                <View style={styles.unlockedBox}>
                  <Ionicons name="checkmark-circle" size={16} color={THEME.success} />
                  <Text style={styles.unlockedText}>
                    Accès débloqué — contactez le support via WhatsApp pour recevoir vos corrigés
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
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
  empty: { backgroundColor: "#fff", padding: 30, borderRadius: 16, alignItems: "center", gap: 8, borderWidth: 1, borderColor: THEME.border, marginTop: 30 },
  emptyTitle: { color: THEME.text, fontWeight: "800", fontSize: 18 },
  emptyText: { color: THEME.textMuted, textAlign: "center", marginBottom: 14 },
  cta: { paddingHorizontal: 22, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "800" },
  card: { backgroundColor: "#fff", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: THEME.border, marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontWeight: "800", fontSize: 12, flex: 1 },
  orderId: { color: THEME.textMuted, fontSize: 10, fontFamily: "monospace" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  itemTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  itemTagText: { fontSize: 11, color: THEME.text, fontWeight: "600", textTransform: "capitalize" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amount: { fontWeight: "900", color: THEME.text, fontSize: 16 },
  svc: { color: THEME.textMuted, fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  waBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#25D366", paddingHorizontal: 12, height: 36, borderRadius: 10 },
  waText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  unlockedBox: { flexDirection: "row", gap: 6, alignItems: "flex-start", backgroundColor: "#DCFCE7", padding: 10, borderRadius: 10, marginTop: 10 },
  unlockedText: { color: "#166534", flex: 1, fontSize: 12, lineHeight: 16 },
});
