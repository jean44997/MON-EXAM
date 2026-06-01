import { useState } from "react";
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

import { API } from "@/src/api";
import { THEME } from "@/src/theme";

export default function AdminScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) {
      Alert.alert("Token requis", "Entrez le token administrateur");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/orders`, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) throw new Error("Token invalide");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function validate(orderId: string) {
    try {
      const res = await fetch(`${API}/admin/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!res.ok) throw new Error("Échec");
      Alert.alert("OK", "Commande validée");
      load();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe} testID="admin-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={THEME.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Admin</Text>
      </View>

      <View style={styles.box}>
        <Text style={styles.label}>TOKEN ADMINISTRATEUR</Text>
        <TextInput
          testID="admin-token"
          value={token}
          onChangeText={setToken}
          secureTextEntry
          placeholder="monexam-admin-2026"
          placeholderTextColor={THEME.textMuted}
          style={styles.input}
        />
        <TouchableOpacity testID="admin-load" onPress={load} style={styles.btn}>
          <Text style={styles.btnText}>{loading ? "..." : "Charger les commandes"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {orders.map((o) => (
          <View key={o.order_id} style={styles.card}>
            <Text style={styles.oid}>{o.order_id}</Text>
            <Text style={styles.meta}>
              {o.status} · {o.amount} XOF · {o.payment_method} · {o.phone}
            </Text>
            <Text style={styles.meta}>Code: {o.activation_code}</Text>
            {o.txn_ref && <Text style={styles.meta}>TXN: {o.txn_ref}</Text>}
            {o.status === "awaiting_validation" && (
              <TouchableOpacity
                testID={`validate-${o.order_id}`}
                onPress={() => validate(o.order_id)}
                style={styles.validateBtn}
              >
                <Text style={styles.validateText}>Valider</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: THEME.border },
  title: { color: THEME.text, fontSize: 24, fontWeight: "900" },
  box: { margin: 16, backgroundColor: "#fff", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: THEME.border },
  label: { fontSize: 11, color: THEME.textMuted, fontWeight: "800", letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: "#F1F5F9", borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  btn: { backgroundColor: THEME.primary, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, marginBottom: 8 },
  oid: { fontWeight: "800", color: THEME.text, fontSize: 13, fontFamily: "monospace" },
  meta: { color: THEME.textMuted, fontSize: 12, marginTop: 4 },
  validateBtn: { marginTop: 10, backgroundColor: THEME.success, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  validateText: { color: "#fff", fontWeight: "800" },
});
