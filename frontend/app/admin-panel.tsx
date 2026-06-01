import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { API, clearAdminSession, getAdminSession } from "@/src/api";
import { useTheme } from "@/src/theme-context";

type Order = {
  order_id: string;
  user_id: string;
  phone: string;
  amount: number;
  status: string;
  payment_method: string;
  activation_code: string;
  txn_ref?: string;
  items: any[];
  service: string;
  pack: string;
  created_at: string;
};

const TABS = [
  { id: "awaiting_validation", label: "À valider", icon: "time" },
  { id: "pending", label: "En attente", icon: "hourglass" },
  { id: "paid", label: "Validées", icon: "checkmark-done" },
  { id: "refused", label: "Refusées", icon: "close-circle" },
  { id: "expired", label: "Expirées", icon: "alert-circle" },
];

export default function AdminPanelScreen() {
  const router = useRouter();
  const { palette, mode } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState("awaiting_validation");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const token = await getAdminSession();
    if (!token) {
      router.replace("/admin-login");
      return;
    }
    try {
      const res = await fetch(`${API}/admin/orders`, { headers: { "x-admin-session": token } });
      if (res.status === 401) {
        await clearAdminSession();
        router.replace("/admin-login");
        return;
      }
      const data = await res.json();
      setOrders(data.orders || []);
      setCounts(data.counts || {});
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000); // poll every 10s for real-time
    return () => clearInterval(id);
  }, [load]);

  async function action(order: Order, type: "accept" | "refuse" | "delete") {
    const labels = {
      accept: { title: "Accepter le paiement", msg: "Êtes-vous sûr de vouloir ACCEPTER cette commande ? L'utilisateur recevra l'accès immédiatement.", style: "default" as const },
      refuse: { title: "Refuser le paiement", msg: "Êtes-vous sûr de vouloir REFUSER cette commande ? L'utilisateur sera notifié.", style: "destructive" as const },
      delete: { title: "Supprimer", msg: "Supprimer définitivement cette commande ?", style: "destructive" as const },
    };
    const l = labels[type];
    Alert.alert(l.title, l.msg, [
      { text: "Annuler", style: "cancel" },
      {
        text: type === "accept" ? "Oui, accepter" : type === "refuse" ? "Oui, refuser" : "Oui, supprimer",
        style: l.style,
        onPress: async () => {
          try {
            const token = await getAdminSession();
            const res = await fetch(`${API}/admin/action`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-admin-session": token || "" },
              body: JSON.stringify({ order_id: order.order_id, action: type }),
            });
            if (!res.ok) throw new Error("Échec");
            load();
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  }

  async function logout() {
    await clearAdminSession();
    router.replace("/");
  }

  const filtered = orders.filter((o) => o.status === tab);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="admin-panel-screen">
      <View style={[styles.header, { backgroundColor: mode === "dark" ? "#0B1220" : "#0F172A" }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>ADMIN · MON EXAM</Text>
          <Text style={styles.title}>Tableau de bord</Text>
        </View>
        <TouchableOpacity onPress={logout} testID="admin-logout" style={styles.logout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.id}
            testID={`tab-${t.id}`}
            activeOpacity={0.85}
            onPress={() => setTab(t.id)}
            style={[
              styles.tab,
              { backgroundColor: palette.surface, borderColor: palette.border },
              tab === t.id && { backgroundColor: palette.primary, borderColor: palette.primary },
            ]}
          >
            <Ionicons name={t.icon as any} size={14} color={tab === t.id ? "#fff" : palette.text} />
            <Text style={[styles.tabText, { color: tab === t.id ? "#fff" : palette.text }]}>
              {t.label}
            </Text>
            {(counts[t.id] || 0) > 0 && (
              <View style={[styles.countPill, { backgroundColor: tab === t.id ? "#fff" : palette.primary }]}>
                <Text style={[styles.countText, { color: tab === t.id ? palette.primary : "#fff" }]}>
                  {counts[t.id]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && <ActivityIndicator color={palette.primary} style={{ marginTop: 30 }} />}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }}
            tintColor={palette.primary}
          />
        }
      >
        {!loading && filtered.length === 0 && (
          <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Ionicons name="folder-open-outline" size={36} color={palette.textMuted} />
            <Text style={[styles.emptyText, { color: palette.textMuted }]}>Aucune commande dans cette catégorie</Text>
          </View>
        )}

        {filtered.map((o) => (
          <View key={o.order_id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]} testID={`admin-order-${o.order_id}`}>
            <View style={styles.cardTop}>
              <View>
                <Text style={[styles.oid, { color: palette.text }]}>{o.order_id}</Text>
                <Text style={[styles.created, { color: palette.textMuted }]}>{new Date(o.created_at).toLocaleString("fr-FR")}</Text>
              </View>
              <Text style={[styles.amount, { color: palette.primary }]}>{o.amount.toLocaleString("fr-FR")} XOF</Text>
            </View>

            <View style={[styles.info, { backgroundColor: mode === "dark" ? "#1F2937" : "#F1F5F9" }]}>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={13} color={palette.textMuted} />
                <Text style={[styles.infoLabel, { color: palette.textMuted }]}>User</Text>
                <Text style={[styles.infoVal, { color: palette.text }]}>{o.user_id}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={13} color={palette.textMuted} />
                <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Tél</Text>
                <Text style={[styles.infoVal, { color: palette.text }]}>{o.phone}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="key" size={13} color={palette.textMuted} />
                <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Code</Text>
                <Text style={[styles.infoVal, { color: palette.primary, fontFamily: "monospace" }]}>{o.activation_code}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="card" size={13} color={palette.textMuted} />
                <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Pay</Text>
                <Text style={[styles.infoVal, { color: palette.text }]}>{o.payment_method.toUpperCase()}</Text>
              </View>
              {o.txn_ref && (
                <View style={styles.infoRow}>
                  <Ionicons name="receipt" size={13} color={palette.textMuted} />
                  <Text style={[styles.infoLabel, { color: palette.textMuted }]}>TXN</Text>
                  <Text style={[styles.infoVal, { color: palette.text }]}>{o.txn_ref}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Ionicons name="cube" size={13} color={palette.textMuted} />
                <Text style={[styles.infoLabel, { color: palette.textMuted }]}>Items</Text>
                <Text style={[styles.infoVal, { color: palette.text }]}>{o.items.length} · {o.pack} · {o.service}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              {o.status === "awaiting_validation" && (
                <>
                  <TouchableOpacity
                    testID={`accept-${o.order_id}`}
                    onPress={() => action(o, "accept")}
                    style={[styles.btn, { backgroundColor: "#10B981" }]}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.btnText}>Accepter</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    testID={`refuse-${o.order_id}`}
                    onPress={() => action(o, "refuse")}
                    style={[styles.btn, { backgroundColor: "#EF4444" }]}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                    <Text style={styles.btnText}>Refuser</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity
                testID={`del-${o.order_id}`}
                onPress={() => action(o, "delete")}
                style={[styles.btn, { backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.danger }]}
              >
                <Ionicons name="trash" size={16} color={palette.danger} />
                <Text style={[styles.btnText, { color: palette.danger }]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { padding: 20, paddingTop: 16, flexDirection: "row", alignItems: "center" },
  kicker: { color: "#FBBF24", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 2, letterSpacing: -0.5 },
  logout: { width: 42, height: 42, borderRadius: 12, backgroundColor: "#1F2937", alignItems: "center", justifyContent: "center" },
  tabs: { padding: 12, gap: 8 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 10, borderWidth: 1 },
  tabText: { fontWeight: "800", fontSize: 12 },
  countPill: { paddingHorizontal: 6, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  countText: { fontWeight: "900", fontSize: 10 },
  list: { padding: 16 },
  empty: { padding: 30, borderRadius: 16, alignItems: "center", gap: 8, borderWidth: 1, marginTop: 30 },
  emptyText: { fontWeight: "600" },
  card: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  oid: { fontSize: 13, fontWeight: "800", fontFamily: "monospace" },
  created: { fontSize: 11, marginTop: 2 },
  amount: { fontWeight: "900", fontSize: 18 },
  info: { padding: 10, borderRadius: 10, gap: 5, marginBottom: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1, width: 38 },
  infoVal: { fontSize: 12, fontWeight: "600", flex: 1 },
  actions: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, height: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
});
