// Mon Exam theme with dark mode support
import { storage } from "@/src/utils/storage";

export type Mode = "light" | "dark";

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  wave: string;
  orange: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
};

export const LIGHT: Palette = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F5F9",
  text: "#0F172A",
  textMuted: "#64748B",
  border: "#E2E8F0",
  primary: "#EA580C",
  primaryDark: "#C2410C",
  secondary: "#16A34A",
  accent: "#FBBF24",
  wave: "#1C449E",
  orange: "#FF7900",
  danger: "#EF4444",
  success: "#10B981",
  warning: "#F59E0B",
  overlay: "rgba(15,23,42,0.55)",
};

export const DARK: Palette = {
  bg: "#0B1220",
  surface: "#111827",
  surfaceAlt: "#1F2937",
  text: "#F9FAFB",
  textMuted: "#9CA3AF",
  border: "#1F2937",
  primary: "#FB923C",
  primaryDark: "#EA580C",
  secondary: "#34D399",
  accent: "#FBBF24",
  wave: "#3B82F6",
  orange: "#FB923C",
  danger: "#F87171",
  success: "#34D399",
  warning: "#FBBF24",
  overlay: "rgba(0,0,0,0.7)",
};

export const COUNTRY_THEMES: Record<string, { primary: string; secondary: string; accent: string; gradient: [string, string] }> = {
  civ: { primary: "#EA580C", secondary: "#16A34A", accent: "#FBBF24", gradient: ["#FF8200", "#00A859"] },
  sen: { primary: "#00853F", secondary: "#FDEF42", accent: "#E31B23", gradient: ["#00853F", "#E31B23"] },
  bfa: { primary: "#EF2B2D", secondary: "#FCD116", accent: "#009E49", gradient: ["#EF2B2D", "#009E49"] },
  mli: { primary: "#14B53A", secondary: "#FCD116", accent: "#CE1126", gradient: ["#14B53A", "#CE1126"] },
};

export async function getMode(): Promise<Mode> {
  const m = await storage.getItem<string>("theme_mode", "dark");
  // Default to dark when nothing stored
  return (m === "light" ? "light" : "dark") as Mode;
}

export async function setMode(m: Mode) {
  await storage.setItem("theme_mode", m);
}
