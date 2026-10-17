"use client";

import type { ReactNode } from "react";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider, type Theme } from "@/providers/theme-provider";
import { I18nProvider, type Locale } from "@/i18n";

import { Toaster } from "@/components/ui/toast";

export interface AppProvidersProps {
  children: ReactNode;
  initialTheme?: Theme;
  initialLocale?: Locale;
}

export function AppProviders({
  children,
  initialTheme,
  initialLocale,
}: AppProvidersProps) {
  return (
    <ThemeProvider initialTheme={initialTheme}>
      <QueryProvider>
        <I18nProvider initialLocale={initialLocale}>
          {children}
          <Toaster />
        </I18nProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
