import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { getUserId, getCountry } from "@/src/api";
import Logo from "@/src/components/Logo";

export default function Index() {
  const router = useRouter();
  const fadeRef = useRef(new Animated.Value(0));
  const slideRef = useRef(new Animated.Value(20));
  const fade = fadeRef.current;
  const slide = slideRef.current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    (async () => {
      const uid = await getUserId();
      const country = await getCountry();
      setTimeout(() => {
        if (country && uid) router.replace("/services");
        else router.replace("/country");
      }, 1500);
    })();
  }, [router, fade, slide]);

  return (
    <LinearGradient colors={["#0B1220", "#1E293B", "#0F172A"]} style={styles.container} testID="splash-screen">
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }], alignItems: "center" }}>
        <Logo size="large" showName={false} />
        <Text style={styles.brand}>Mon Exam</Text>
        <Text style={styles.tag}>Réussite garantie · BAC 2026</Text>
        <View style={styles.divider} />
        <Text style={styles.country}>CIV · SÉN · BFA · MLI</Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  brand: { color: "#fff", fontSize: 44, fontWeight: "900", letterSpacing: -1.5, marginTop: 24 },
  tag: { color: "#FBBF24", marginTop: 8, fontWeight: "700", letterSpacing: 3, fontSize: 12 },
  divider: { width: 60, height: 2, backgroundColor: "#EA580C", marginTop: 20, borderRadius: 2 },
  country: { color: "#64748B", marginTop: 16, fontWeight: "600", letterSpacing: 4, fontSize: 11 },
});
