import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whiteboard — Colaboração Visual em Tempo Real",
  description:
    "Quadro branco colaborativo infinito em tempo real com CRDT e sincronização ultra rápida",
};

const themeCookieBootstrapScript = `
(function() {
  try {
    var match = document.cookie.match(/(?:^|;\\s*)wb_theme=([^;]*)/);
    var theme = match ? decodeURIComponent(match[1]) : 'system';
    var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    var locMatch = document.cookie.match(/(?:^|;\\s*)wb_locale=([^;]*)/);
    var locale = locMatch ? decodeURIComponent(locMatch[1]) : '';
    if (locale === 'en') {
      document.documentElement.lang = 'en-US';
    } else if (locale === 'pt') {
      document.documentElement.lang = 'pt-BR';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeCookieBootstrapScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-canvas text-text-primary selection:bg-accent-primary/20 selection:text-accent-primary">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
