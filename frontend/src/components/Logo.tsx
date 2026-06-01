import { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { useTheme } from "@/src/theme-context";

type Props = {
  size?: "small" | "medium" | "large";
  countdownTaps?: boolean; // 5 taps → admin
  showName?: boolean;
  testID?: string;
};

const ADMIN_TAPS_REQUIRED = 5;
const TAP_WINDOW_MS = 2500;

export default function Logo({ size = "medium", countdownTaps = false, showName = true, testID }: Props) {
  const router = useRouter();
  const { palette } = useTheme();
  const tapCount = useRef(0);
  const tapTimer = useRef<any>(null);
  const scale = useRef(new Animated.Value(1)).current;

  const dims = { small: 32, medium: 44, large: 64 }[size];
  const fontSize = { small: 14, medium: 18, large: 28 }[size];

  function onTap() {
    if (!countdownTaps) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.9, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, TAP_WINDOW_MS);
    if (tapCount.current >= ADMIN_TAPS_REQUIRED) {
      tapCount.current = 0;
      router.push("/admin-login");
    }
  }

  return (
    <TouchableOpacity activeOpacity={countdownTaps ? 0.9 : 1} onPress={onTap} testID={testID || "app-logo"}>
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={["#EA580C", "#16A34A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.badge, { width: dims, height: dims, borderRadius: dims / 4 }]}
        >
          <View style={styles.inner}>
            <Text style={[styles.glyph, { fontSize: fontSize - 2 }]}>M</Text>
            <View style={styles.dot} />
            <Text style={[styles.glyph, { fontSize: fontSize - 2, color: "#FBBF24" }]}>E</Text>
          </View>
        </LinearGradient>
        {showName && (
          <View>
            <Text style={[styles.brand, { color: palette.text, fontSize }]}>Mon Exam</Text>
            <Text style={[styles.tag, { color: palette.primary }]}>BAC · 2026</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { alignItems: "center", justifyContent: "center", padding: 2 },
  inner: { flex: 1, backgroundColor: "#0F172A", borderRadius: 8, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 1, width: "100%" },
  glyph: { color: "#fff", fontWeight: "900", letterSpacing: -1 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#FBBF24" },
  brand: { fontWeight: "900", letterSpacing: -0.5 },
  tag: { fontSize: 9, fontWeight: "800", letterSpacing: 2 },
});
