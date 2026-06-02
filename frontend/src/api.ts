// Shared API client routing requests to Supabase (Mon Exam V2)
import { storage } from "@/src/utils/storage";
import { supabase } from "@/src/supabase";
import {
  COUNTRIES,
  SERIES_BY_COUNTRY,
  SUBJECTS_BY_SERIES,
  SERVICES,
  APP_SETTINGS_DEFAULT,
  slugify,
} from "@/src/config";

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

// Generic URL parser helper
function parseQueryParams(urlStr: string): Record<string, string> {
  const params: Record<string, string> = {};
  const queryStart = urlStr.indexOf("?");
  if (queryStart === -1) return params;
  const queryString = urlStr.substring(queryStart + 1);
  const pairs = queryString.split("&");
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(value || "");
    }
  }
  return params;
}

// Redirect and map HTTP GET requests to local config or Supabase RPCs
export async function apiGet<T = any>(path: string, headers: Record<string, string> = {}): Promise<T> {
  try {
    const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
    const url = cleanPath.split("?")[0];
    const params = parseQueryParams(cleanPath);

    // 1. Config endpoint
    if (url === "/config") {
      const country = (params.country || "civ").toLowerCase();
      const series = SERIES_BY_COUNTRY[country] || SERIES_BY_COUNTRY["civ"];
      const response: AppConfig = {
        countries: COUNTRIES,
        series: series,
        services: SERVICES,
        wave_number: APP_SETTINGS_DEFAULT.wave_number,
        orange_number: APP_SETTINGS_DEFAULT.orange_number,
        whatsapp_link: APP_SETTINGS_DEFAULT.whatsapp_link,
        payment_window_min: APP_SETTINGS_DEFAULT.payment_window_min,
        pricing: APP_SETTINGS_DEFAULT.pricing,
      };
      return response as any;
    }

    // 2. Subjects endpoint
    if (url === "/subjects") {
      const series = params.series || "";
      const subSeries = params.sub_series || "";
      const country = (params.country || "civ").toLowerCase();
      const key = `${country}_${series}`;
      const raw = SUBJECTS_BY_SERIES[key] || [];
      const subjects = raw.map(([name, icon]) => ({
        id: `${country}-${series}-${slugify(name)}`,
        name,
        series,
        sub_series: subSeries,
        country,
        icon,
        description: `Sujet officiel BAC ${country.toUpperCase()} — ${name}`,
        year: "2026",
      }));
      return { subjects, count: subjects.length } as any;
    }

    // 3. Order details endpoint
    if (url.startsWith("/order/")) {
      const orderId = url.split("/")[2];
      const userId = params.user_id || "";
      const { data, error } = await supabase.rpc("get_user_order", {
        p_order_id: orderId,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 4. Purchases endpoint
    if (url === "/purchases") {
      const userId = params.user_id || "";
      const { data, error } = await supabase.rpc("get_user_purchases", {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 5. Notifications endpoint
    if (url === "/notifications") {
      const userId = params.user_id || "";
      const { data, error } = await supabase.rpc("get_user_notifications", {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 6. Admin orders endpoint
    if (url === "/admin/orders") {
      const adminCode = headers["x-admin-session"] || "";
      const { data, error } = await supabase.rpc("admin_get_orders", {
        p_admin_code: adminCode,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    throw new Error(`GET Endpoint ${path} not implemented on Supabase routing`);
  } catch (err: any) {
    console.error(`apiGet error on ${path}:`, err);
    throw err;
  }
}

// Redirect and map HTTP POST requests to Supabase RPCs
export async function apiPost<T = any>(path: string, body: any, headers: Record<string, string> = {}): Promise<T> {
  try {
    const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
    const url = cleanPath.split("?")[0];

    // 1. Session Init
    if (url === "/session/init") {
      const randomId = "MEX-" + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
      const { data, error } = await supabase.rpc("init_session", {
        p_user_id: randomId,
        p_country_code: body.country_code,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 2. Checkout (Create Order)
    if (url === "/checkout") {
      const { data, error } = await supabase.rpc("create_order", {
        p_user_id: body.user_id,
        p_phone: body.phone,
        p_items: body.items,
        p_service: body.service,
        p_pack: body.pack || "single",
        p_country_code: body.country_code || "civ",
        p_payment_method: body.payment_method,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 3. Simulate Payment
    if (url === "/payment/simulate") {
      const { data, error } = await supabase.rpc("simulate_payment", {
        p_order_id: body.order_id,
        p_user_id: body.user_id,
        p_txn_ref: body.txn_ref,
        p_activation_code: body.activation_code,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    // 4. Admin Login
    if (url === "/admin/login") {
      if (body.code === "MESSI10@@.COM") {
        return { token: body.code } as any;
      } else {
        throw new Error("Code admin incorrect");
      }
    }

    // 5. Admin Action
    if (url === "/admin/action") {
      const adminCode = headers["x-admin-session"] || "";
      const { data, error } = await supabase.rpc("admin_action", {
        p_admin_code: adminCode,
        p_order_id: body.order_id,
        p_action: body.action,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    throw new Error(`POST Endpoint ${path} not implemented on Supabase routing`);
  } catch (err: any) {
    console.error(`apiPost error on ${path}:`, err);
    throw err;
  }
}

// Redirect and map HTTP DELETE requests to Supabase RPCs
export async function apiDelete<T = any>(path: string, headers: Record<string, string> = {}): Promise<T> {
  try {
    const cleanPath = path.startsWith("/api") ? path.substring(4) : path;
    const url = cleanPath.split("?")[0];
    const params = parseQueryParams(cleanPath);

    // 1. Delete user order
    if (url.startsWith("/order/")) {
      const orderId = url.split("/")[2];
      const userId = params.user_id || "";
      const { data, error } = await supabase.rpc("delete_user_order", {
        p_order_id: orderId,
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }

    throw new Error(`DELETE Endpoint ${path} not implemented on Supabase routing`);
  } catch (err: any) {
    console.error(`apiDelete error on ${path}:`, err);
    throw err;
  }
}

// Session storage helpers
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

// Admin session
export async function getAdminSession(): Promise<string | null> {
  return await storage.secureGet<string>("admin_session", "");
}
export async function setAdminSession(t: string) {
  await storage.secureSet("admin_session", t);
}
export async function clearAdminSession() {
  await storage.secureRemove("admin_session");
}

// Cart storage helpers
export type CartItem = { subject_id: string; name: string; sub_series: string; series: string; country: string };
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
