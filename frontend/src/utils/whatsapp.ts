// Shared WhatsApp deep-link builder with pre-filled context
import { Linking, Alert, Platform } from "react-native";

const WHATSAPP_NUMBER = "2250545019493";

export type WhatsAppContext = {
  userId?: string;
  countryCode?: string;
  service?: string;
  orderId?: string;
  activationCode?: string;
  amount?: number;
  phone?: string;
};

function emojiCountry(code?: string): string {
  switch (code) {
    case "civ": return "🇨🇮 Côte d'Ivoire";
    case "sen": return "🇸🇳 Sénégal";
    case "bfa": return "🇧🇫 Burkina Faso";
    case "mli": return "🇲🇱 Mali";
    default: return "";
  }
}

function labelService(s?: string): string {
  switch (s) {
    case "early": return "Corrigés avant le jour J";
    case "realtime": return "Corrections en temps réel";
    case "accomplice": return "Complice à l'école";
    case "modification": return "Modification de notes";
    case "other": return "Service personnalisé";
    default: return s || "Service Mon Exam";
  }
}

export function buildMessage(ctx: WhatsAppContext, intent: "general" | "after-payment" | "support" = "general"): string {
  const lines: string[] = [];
  if (intent === "after-payment") {
    lines.push("Bonjour Mon Exam 👋");
    lines.push("Je viens d'effectuer mon paiement et j'attends l'accès à mes corrigés.");
  } else if (intent === "support") {
    lines.push("Bonjour Mon Exam 👋");
    lines.push("J'ai besoin d'aide concernant ma commande.");
  } else {
    lines.push("Bonjour Mon Exam 👋");
    lines.push("Je vous contacte depuis l'application.");
  }
  lines.push("");
  if (ctx.countryCode) lines.push(`📍 Pays : ${emojiCountry(ctx.countryCode)}`);
  if (ctx.service) lines.push(`🎯 Service : ${labelService(ctx.service)}`);
  if (ctx.userId) lines.push(`🆔 Mon ID : ${ctx.userId}`);
  if (ctx.orderId) lines.push(`📦 Commande : ${ctx.orderId}`);
  if (ctx.activationCode) lines.push(`🔑 Code activation : ${ctx.activationCode}`);
  if (ctx.amount) lines.push(`💰 Montant : ${ctx.amount.toLocaleString("fr-FR")} XOF`);
  if (ctx.phone) lines.push(`📞 Mon numéro : ${ctx.phone}`);
  lines.push("");
  lines.push("Merci de me répondre dès que possible 🙏");
  return lines.join("\n");
}

export async function openWhatsApp(ctx: WhatsAppContext, intent: "general" | "after-payment" | "support" = "general") {
  const msg = encodeURIComponent(buildMessage(ctx, intent));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
  try {
    const can = await Linking.canOpenURL(url);
    if (!can && Platform.OS !== "web") {
      Alert.alert("WhatsApp introuvable", "Installez WhatsApp puis réessayez.");
      return;
    }
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp.");
  }
}
