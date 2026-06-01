import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { apiPost, setAdminSession } from "@/src/api";
import { useTheme } from "@/src/theme-context";

export default function AdminLoginScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [show, setShow] = useState(false);

  async function login() {
    if (!code) {
      Alert.alert("Code requis", "Saisissez le code administrateur.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ token: string }>("/admin/login", { code });
      await setAdminSession(res.token);
      router.replace("/admin-panel");
    } catch (e: any) {
      Alert.alert("Accès refusé", e.message || "Code incorrect");
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="admin-login-screen">
      <LinearGradient colors={["#0B1220", "#1E293B", "#0F172A"]} style={styles.hero}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.lockBubble}>
          <Ionicons name="shield-checkmark" size={32} color="#FBBF24" />
        </View>
        <Text style={styles.title}>Zone restreinte</Text>
        <Text style={styles.subtitle}>Accès réservé — veuillez saisir votre code</Text>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.body}>
        <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.label, { color: palette.textMuted }]}>CODE ADMINISTRATEUR</Text>
          <View style={[styles.inputBox, { borderColor: palette.border }]}>
            <TextInput
              testID="admin-code-input"
              value={code}
              onChangeText={setCode}
              secureTextEntry={!show}
              placeholder="••••••••••••"
              placeholderTextColor={palette.textMuted}
              autoCapitalize="none"
              style={[styles.input, { color: palette.text }]}
            />
            <TouchableOpacity onPress={() => setShow((s) => !s)} testID="show-code">
              <Ionicons name={show ? "eye-off" : "eye"} size={20} color={palette.textMuted} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            testID="admin-login-btn"
            activeOpacity={0.85}
            disabled={submitting}
            onPress={login}
            style={[styles.btn, { backgroundColor: palette.primary, opacity: submitting ? 0.6 : 1 }]}
          >
            <Ionicons name="log-in" size={20} color="#fff" />
            <Text style={styles.btnText}>{submitting ? "..." : "Se connecter"}</Text>
          </TouchableOpacity>
          <Text style={[styles.warn, { color: palette.textMuted }]}>
            Toute tentative non autorisée sera enregistrée.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { padding: 24, alignItems: "center", paddingTop: 50 },
  back: { position: "absolute", top: 16, left: 16, width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#1F293750" },
  lockBubble: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#0F172A", borderWidth: 2, borderColor: "#FBBF24", alignItems: "center", justifyContent: "center", marginTop: 24 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 18, letterSpacing: -0.5 },
  subtitle: { color: "#94A3B8", marginTop: 6, fontSize: 13 },
  body: { flex: 1, padding: 20 },
  card: { padding: 20, borderRadius: 18, borderWidth: 1, marginTop: 20 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 2, marginBottom: 10 },
  inputBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, marginBottom: 14 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, fontFamily: "monospace" },
  btn: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  warn: { fontSize: 11, textAlign: "center", marginTop: 14 },
});
