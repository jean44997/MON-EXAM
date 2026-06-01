import { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from "react-native";
import { useRouter } from "expo-router";

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

  const dims = { small: 36, medium: 48, large: 96 }[size];
  const fontSize = { small: 14, medium: 18, large: 28 }[size];

  function onTap() {
    if (!countdownTaps) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, TAP_WINDOW_MS);
    if (tapCount.current >= ADMIN_TAPS_REQUIRED) {
      tapCount.current = 0;
      router.push("/admin-login");
    }
  }

  return (
    <TouchableOpacity activeOpacity={countdownTaps ? 0.85 : 1} onPress={onTap} testID={testID || "app-logo"}>
      <Animated.View style={[styles.row, { transform: [{ scale }] }]}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={[styles.icon, { width: dims, height: dims, borderRadius: dims / 5 }]}
          resizeMode="cover"
        />
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
  icon: { backgroundColor: "#0F172A" },
  brand: { fontWeight: "900", letterSpacing: -0.5 },
  tag: { fontSize: 9, fontWeight: "800", letterSpacing: 2 },
});
