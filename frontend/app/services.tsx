import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { apiGet, getCountry, getUserId, type AppConfig } from "@/src/api";
import { COUNTRY_THEMES } from "@/src/theme";
import { useTheme } from "@/src/theme-context";
import { storage } from "@/src/utils/storage";
import Logo from "@/src/components/Logo";

const ICON_MAP: Record<string, any> = {
  early: "calendar",
  realtime: "time",
  accomplice: "shield-checkmark",
  modification: "create",
  other: "chatbubbles",
};

export default function ServicesScreen() {
  const router = useRouter();
  const { palette, mode, toggle } = useTheme();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [country, setC] = useState<string>("civ");
  const [uid, setUid] = useState<string>("");
  const [notifCount, setNotifCount] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const c = (await getCountry()) || "civ";
      const u = (await getUserId()) || "";
      setC(c);
      setUid(u);
      const cfg = await apiGet<AppConfig>(`/config?country=${c}`);
      setConfig(cfg);
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      // poll notifications
      if (u) {
        try {
          const n = await apiGet<{ notifications: any[] }>(`/notifications?user_id=${u}`);
          setNotifCount(n.notifications.filter((x) => x.status === "paid" || x.status === "refused").length);
        } catch {}
      }
    })();
  }, [fade]);

  function pickService(id: string, svcMode: string) {
    storage.setItem("selected_service", id);
    if (svcMode === "whatsapp" && config) {
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
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.bg }]} testID="services-screen">
      <View style={styles.header}>
        <Logo size="small" countdownTaps testID="hidden-admin-logo" />
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          testID="theme-toggle"
          onPress={toggle}
          style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name={mode === "dark" ? "sunny" : "moon"} size={18} color={palette.text} />
        </TouchableOpacity>
        <TouchableOpacity
          testID="purchases-btn"
          onPress={() => router.push("/purchases")}
          style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="bag-handle" size={18} color={palette.text} />
          {notifCount > 0 && (
            <View style={[styles.notifDot, { backgroundColor: palette.danger }]}>
              <Text style={styles.notifDotText}>{notifCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          testID="logout-btn"
          onPress={async () => {
            await storage.removeItem("user_id");
            router.replace("/country");
          }}
          style={[styles.iconBtn, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <Ionicons name="log-out-outline" size={18} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.titleKicker, { color: theme.primary }]}>NOS SERVICES</Text>
        <Text style={[styles.title, { color: palette.text }]}>Choisis ce qui te convient</Text>
      </View>

      <View style={[styles.idBadge, { backgroundColor: mode === "dark" ? "#1F2937" : "#0F172A", borderColor: theme.primary + "60" }]}>
        <View style={styles.idRow}>
          <Ionicons name="shield-checkmark" size={14} color="#FBBF24" />
          <Text style={styles.idLabel}>SESSION SÉCURISÉE</Text>
        </View>
        <Text style={styles.idValue} testID="user-id-display">{uid || "..."}</Text>
      </View>

      <Animated.ScrollView style={{ opacity: fade }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {!config && <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />}
        {config?.services.map((s, idx) => (
          <TouchableOpacity
            key={s.id}
            testID={`service-${s.id}`}
            activeOpacity={0.85}
            style={[
              styles.serviceCard,
              { backgroundColor: palette.surface, borderColor: palette.border, borderLeftColor: theme.primary },
            ]}
            onPress={() => pickService(s.id, s.mode)}
          >
            <View style={[styles.iconBubble, { backgroundColor: theme.primary + "15" }]}>
              <Ionicons name={(ICON_MAP[s.id] || "ellipsis-horizontal") as any} size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.serviceTitle, { color: palette.text }]}>
                {idx + 1}. {s.title}
              </Text>
              <Text style={[styles.serviceSubtitle, { color: palette.textMuted }]}>{s.subtitle}</Text>
              <View style={styles.modeRow}>
                <View style={[styles.tag, { backgroundColor: s.mode === "platform" ? "#16A34A20" : "#25D36620" }]}>
                  <Text style={[styles.tagText, { color: s.mode === "platform" ? "#16A34A" : "#25D366" }]}>
                    {s.mode === "platform" ? "SUR LA PLATEFORME" : "VIA WHATSAPP"}
                  </Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.textMuted} />
          </TouchableOpacity>
        ))}

        <View style={[styles.infoBox, { backgroundColor: mode === "dark" ? "#451A03" : "#FEF3C7" }]}>
          <Ionicons name="information-circle" size={20} color={palette.warning} />
          <Text style={[styles.infoText, { color: mode === "dark" ? "#FCD34D" : "#92400E" }]}>
            Paiement sécurisé Wave & Orange Money · Code unique à usage unique · Expiration 5 min · Aucune fraude possible
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center", position: "relative" },
  notifDot: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  notifDotText: { color: "#fff", fontWeight: "900", fontSize: 9 },
  titleBlock: { paddingHorizontal: 20, marginTop: 6 },
  titleKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  title: { fontSize: 28, fontWeight: "900", marginTop: 2, letterSpacing: -0.5 },
  idBadge: { marginHorizontal: 20, marginVertical: 14, borderRadius: 14, padding: 12, borderWidth: 2 },
  idRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  idLabel: { color: "#FBBF24", fontSize: 10, fontWeight: "800", letterSpacing: 2 },
  idValue: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 4, fontFamily: "monospace" },
  list: { padding: 16 },
  serviceCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderLeftWidth: 4, marginBottom: 10 },
  iconBubble: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceTitle: { fontSize: 15, fontWeight: "800" },
  serviceSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  modeRow: { flexDirection: "row", marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  infoBox: { borderRadius: 14, padding: 12, flexDirection: "row", gap: 8, marginTop: 8 },
  infoText: { fontSize: 12, flex: 1, lineHeight: 16 },
});
