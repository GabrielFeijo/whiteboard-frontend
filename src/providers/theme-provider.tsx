"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  COOKIE_NAMES,
  setClientCookie,
} from "@/lib/cookies/cookie-storage";

export const Theme = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export type Theme = (typeof Theme)[keyof typeof Theme];

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: Theme.SYSTEM,
  resolvedTheme: "light",
  setTheme: () => {},
});

export function isValidTheme(value: unknown): value is Theme {
  return (
    value === Theme.LIGHT ||
    value === Theme.DARK ||
    value === Theme.SYSTEM
  );
}

function resolveInitialTheme(initialTheme?: Theme): Theme {
  if (initialTheme && isValidTheme(initialTheme)) {
    return initialTheme;
  }
  return "system";
}

export interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: Theme;
}

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [prevInitialTheme, setPrevInitialTheme] = useState(initialTheme);
  const [theme, setThemeState] = useState<Theme>(() =>
    resolveInitialTheme(initialTheme),
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    initialTheme === "dark" ? "dark" : "light",
  );

  if (initialTheme && isValidTheme(initialTheme) && initialTheme !== prevInitialTheme) {
    setPrevInitialTheme(initialTheme);
    setThemeState(initialTheme);
  }

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);
      const active = isDark ? "dark" : "light";
      setResolvedTheme(active);

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();

    const listener = () => {
      if (theme === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setClientCookie(COOKIE_NAMES.THEME, newTheme);
  }, []);

  const contextValue = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
