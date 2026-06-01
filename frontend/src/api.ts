import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export const API = `${BASE}/api`;

export type Country = {
  code: string;
  name: string;
  flag_colors: string[];
  primary: string;
  secondary: string;
  active: boolean;
};

export type Service = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  mode: "platform" | "whatsapp";
};

export type AppConfig = {
  countries: Country[];
  series: Record<string, { label: string; description: string; color: string; sub_series: string[] }>;
  services: Service[];
  wave_number: string;
  orange_number: string;
  whatsapp_link: string;
  payment_window_min: number;
  pricing: { single: number; pack5: number; exam: number; pack6: number };
};

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

// Session helpers
export async function getUserId(): Promise<string | null> {
  return await storage.getItem<string>("user_id", "");
}
export async function setUserId(id: string) {
  await storage.setItem("user_id", id);
}
export async function getCountry(): Promise<string | null> {
  return await storage.getItem<string>("country_code", "");
}
export async function setCountry(c: string) {
  await storage.setItem("country_code", c);
}

// Cart helpers
export type CartItem = { subject_id: string; name: string; sub_series: string; series: string };
export async function getCart(): Promise<CartItem[]> {
  const raw = await storage.getItem<string>("cart", "[]");
  try {
    return JSON.parse(raw || "[]") as CartItem[];
  } catch {
    return [];
  }
}
export async function setCart(items: CartItem[]) {
  await storage.setItem("cart", JSON.stringify(items));
}
export async function clearCart() {
  await storage.setItem("cart", "[]");
}
