import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, apiDelete, getCountry, getUserId } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";

const STATUS_INFO: Record<string, { text: string; color: string; icon: string }> = {
  paid: { text: "Débloqué", color: "#10B981", icon: "checkmark-circle" },
  awaiting_validation: { text: "En attente de validation", color: "#F59E0B", icon: "time" },
  pending: { text: "Paiement en attente", color: "#64748B", icon: "hourglass" },
  refused: { text: "Refusé", color: "#EF4444", icon: "close-circle" },
  expired: { text: "Expiré", color: "#94A3B8", icon: "alert-circle" },
};

export default function PurchasesScreen() {
  const router = useRouter();
  const { palette, mode } = useTheme();
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

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;

  function openWhatsApp(o: any) {
    const msg = encodeURIComponent(
      `Bonjour, commande ${o.order_id} sur Mon Exam. Code: ${o.activation_code}. Merci de m'envoyer les corrigés.`,
    );
    Linking.openURL(`https://wa.me/2250545019493?text=${msg}`).catch(() => {});
  }

  async function deleteOrder(o: any) {
    Alert.alert(
      "Supprimer la commande",
      `Confirmer la suppression de ${o.order_id} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const uid = await getUserId();
              await apiDelete(`/order/${o.order_id}?user_id=${uid}`);
              load();
            } catch (e: any) {
              Alert.alert("Erreur", e.message);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="purchases-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.crumb, { color: theme.primary }]}>MES ACHATS</Text>
          <Text style={[styles.title, { color: palette.text }]}>Historique</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={theme.primary}
          />
        }
      >
        {orders.length === 0 && (
          <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="receipt-outline" size={48} color={palette.textMuted} />
            <Text style={[styles.emptyTitle, { color: palette.text }]}>Aucun achat</Text>
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>
              Vos commandes et corrigés débloqués apparaîtront ici.
            </Text>
            <TouchableOpacity testID="goto-catalog" activeOpacity={0.85} onPress={() => router.replace("/catalog")} style={[styles.cta, { backgroundColor: theme.primary }]}>
              <Text style={styles.ctaText}>Parcourir le catalogue</Text>
            </TouchableOpacity>
          </View>
        )}

        {orders.map((o) => {
          const st = STATUS_INFO[o.status] || { text: o.status, color: "#64748B", icon: "help-circle" };
          const unlocked = o.status === "paid";
          const canDelete = o.status !== "paid";
          return (
            <View key={o.order_id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={`order-${o.order_id}`}>
              <View style={styles.cardHead}>
                <Ionicons name={st.icon as any} size={16} color={st.color} />
                <Text style={[styles.statusText, { color: st.color }]}>{st.text}</Text>
                <Text style={[styles.orderId, { color: palette.textMuted }]}>{o.order_id}</Text>
              </View>
              <View style={styles.itemsRow}>
                {o.items.map((it: any, idx: number) => (
                  <View key={idx} style={[styles.itemTag, { backgroundColor: mode === "dark" ? "#1F2937" : "#F1F5F9" }]}>
                    <Ionicons name={unlocked ? "lock-open" : "lock-closed"} size={11} color={unlocked ? "#10B981" : palette.textMuted} />
                    <Text style={[styles.itemTagText, { color: palette.text }]}>
                      {it.subject_id.split("-").slice(2).join(" ")}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={[styles.amount, { color: palette.text }]}>{o.amount.toLocaleString("fr-FR")} XOF</Text>
                  <Text style={[styles.svc, { color: palette.textMuted }]}>{o.service} · {o.pack}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {canDelete && (
                    <TouchableOpacity onPress={() => deleteOrder(o)} testID={`del-${o.order_id}`} style={[styles.delBtn, { borderColor: palette.danger }]}>
                      <Ionicons name="trash" size={14} color={palette.danger} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity testID={`wa-${o.order_id}`} onPress={() => openWhatsApp(o)} style={styles.waBtn}>
                    <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                    <Text style={styles.waText}>Contact</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {unlocked && (
                <View style={[styles.unlockedBox, { backgroundColor: mode === "dark" ? "#064E3B" : "#DCFCE7" }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={[styles.unlockedText, { color: mode === "dark" ? "#A7F3D0" : "#166534" }]}>
                    Accès débloqué — contactez le support pour recevoir vos corrigés
                  </Text>
                </View>
              )}
              {o.status === "refused" && (
                <View style={[styles.refusedBox, { backgroundColor: mode === "dark" ? "#7F1D1D" : "#FEE2E2" }]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={[styles.refusedText, { color: mode === "dark" ? "#FECACA" : "#991B1B" }]}>
                    Paiement refusé. Contactez WhatsApp pour clarifier ou réessayez.
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
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  crumb: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 24, fontWeight: "900" },
  list: { padding: 16 },
  empty: { padding: 30, borderRadius: 16, alignItems: "center", gap: 8, borderWidth: 1, marginTop: 30 },
  emptyTitle: { fontWeight: "800", fontSize: 18 },
  emptyText: { textAlign: "center", marginBottom: 14 },
  cta: { paddingHorizontal: 22, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ctaText: { color: "#fff", fontWeight: "800" },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  statusText: { fontWeight: "800", fontSize: 12, flex: 1 },
  orderId: { fontSize: 10, fontFamily: "monospace" },
  itemsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  itemTag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  itemTagText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amount: { fontWeight: "900", fontSize: 16 },
  svc: { fontSize: 11, marginTop: 2, textTransform: "capitalize" },
  delBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  waBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#25D366", paddingHorizontal: 12, height: 36, borderRadius: 10 },
  waText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  unlockedBox: { flexDirection: "row", gap: 6, alignItems: "flex-start", padding: 10, borderRadius: 10, marginTop: 10 },
  unlockedText: { flex: 1, fontSize: 12, lineHeight: 16 },
  refusedBox: { flexDirection: "row", gap: 6, alignItems: "flex-start", padding: 10, borderRadius: 10, marginTop: 10 },
  refusedText: { flex: 1, fontSize: 12, lineHeight: 16 },
});
