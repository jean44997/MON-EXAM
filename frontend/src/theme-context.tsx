import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { LIGHT, DARK, Palette, Mode, getMode, setMode } from "@/src/theme";

type Ctx = { palette: Palette; mode: Mode; toggle: () => void };
const ThemeCtx = createContext<Ctx>({ palette: LIGHT, mode: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setM] = useState<Mode>("dark");

  useEffect(() => {
    getMode().then(setM);
  }, []);

  const toggle = useCallback(() => {
    setM((prev) => {
      const next = prev === "light" ? "dark" : "light";
      setMode(next);
      return next;
    });
  }, []);

  const palette = mode === "dark" ? DARK : LIGHT;
  return <ThemeCtx.Provider value={{ palette, mode, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}
