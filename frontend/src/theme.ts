// Shared theme constants for Mon Exam
export const THEME = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
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
};

export const FONTS = {
  bold: "700" as const,
  black: "900" as const,
  semi: "600" as const,
  medium: "500" as const,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const COUNTRY_THEMES: Record<string, { primary: string; secondary: string; accent: string; gradient: [string, string] }> = {
  civ: { primary: "#EA580C", secondary: "#16A34A", accent: "#FBBF24", gradient: ["#FF8200", "#00A859"] },
  sen: { primary: "#00853F", secondary: "#FDEF42", accent: "#E31B23", gradient: ["#00853F", "#E31B23"] },
  bfa: { primary: "#EF2B2D", secondary: "#FCD116", accent: "#009E49", gradient: ["#EF2B2D", "#009E49"] },
  mli: { primary: "#14B53A", secondary: "#FCD116", accent: "#CE1126", gradient: ["#14B53A", "#CE1126"] },
};
