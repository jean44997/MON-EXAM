import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  apiGet,
  getCountry,
  getUserId,
  type AppConfig,
} from "@/src/api";
import { THEME, COUNTRY_THEMES } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const ICON_MAP: Record<string, any> = {
  early: "calendar",
  realtime: "time",
  accomplice: "shield-checkmark",
  modification: "create",
  other: "chatbubbles",
};

export default function ServicesScreen() {
  const router = useRouter();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [uid, setUid] = useState<string>("");

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      const u = (await getUserId()) || "";
      setC(c);
      setUid(u);
      const cfg = await apiGet<AppConfig>("/config");
      setConfig(cfg);
    })();
  }, []);

  function pickService(id: string, mode: string) {
    storage.setItem("selected_service", id);
    if (mode === "whatsapp" && config) {
      const msg = encodeURIComponent(
        `Bonjour, je viens du site Mon Exam. Mon ID: ${uid}. Je suis intéressé par le service: ${id}.`,
      );
      Linking.openURL(`${config.whatsapp_link}?text=${msg}`).catch(() => {});
      return;
    }
    router.push("/catalog");
  }

  const theme = COUNTRY_THEMES[country] || COUNTRY_THEMES.civ;

  return (
    <SafeAreaView style={styles.safe} testID="services-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Mon Exam</Text>
          <Text style={styles.title}>Nos services</Text>
        </View>
        <TouchableOpacity
          testID="purchases-btn"
          onPress={() => router.push("/purchases")}
          style={styles.iconBtn}
        >
          <Ionicons name="bag-handle" size={20} color={THEME.text} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="logout-btn"
          onPress={async () => {
            await storage.removeItem("user_id");
            router.replace("/country");
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="log-out-outline" size={20} color={THEME.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.idBadge, { borderColor: theme.primary + "40" }]}>
        <Text style={styles.idLabel}>SESSION SÉCURISÉE</Text>
        <Text style={styles.idValue} testID="user-id-display">{uid || "..."}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={THEME.primary} style={{ marginTop: 40 }} />}
        {config?.services.map((s, idx) => (
          <TouchableOpacity
            key={s.id}
            testID={`service-${s.id}`}
            activeOpacity={0.85}
            style={[styles.serviceCard, { borderLeftColor: theme.primary }]}
            onPress={() => pickService(s.id, s.mode)}
          >
            <View style={[styles.iconBubble, { backgroundColor: theme.primary + "15" }]}>
              <Ionicons
                name={(ICON_MAP[s.id] || "ellipsis-horizontal") as any}
                size={22}
                color={theme.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>
                {idx + 1}. {s.title}
              </Text>
              <Text style={styles.serviceSubtitle}>{s.subtitle}</Text>
              <View style={styles.modeRow}>
                <View
                  style={[
                    styles.tag,
                    { backgroundColor: s.mode === "platform" ? "#16A34A20" : "#25D36620" },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      { color: s.mode === "platform" ? "#16A34A" : "#25D366" },
                    ]}
                  >
                    {s.mode === "platform" ? "SUR LA PLATEFORME" : "VIA WHATSAPP"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={THEME.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={THEME.warning} />
          <Text style={styles.infoText}>
            Paiement sécurisé via Wave & Orange Money · Code unique à usage unique · Expiration en
            5 minutes pour éviter toute fraude.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brand: { color: THEME.primary, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { color: THEME.text, fontSize: 28, fontWeight: "900", marginTop: 2, letterSpacing: -0.5 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
  },
  idBadge: {
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: "#0F172A",
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
  },
  idLabel: { color: "#FBBF24", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  idValue: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 4, fontFamily: "monospace" },
  list: { padding: 16, gap: 12 },
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTitle: { fontSize: 15, fontWeight: "800", color: THEME.text },
  serviceSubtitle: { fontSize: 12, color: THEME.textMuted, marginTop: 4, lineHeight: 16 },
  modeRow: { flexDirection: "row", marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  infoBox: {
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  infoText: { color: "#92400E", fontSize: 12, flex: 1, lineHeight: 16 },
});
