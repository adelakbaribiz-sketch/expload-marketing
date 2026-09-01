import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { Providers } from "@/components/providers";
import { I18nProvider } from "@/i18n/provider";
import { getServerLocale } from "@/i18n/server";
import { getLocaleMeta } from "@/i18n/config";
import { AuthProvider } from "@/components/auth/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const vazirmatn = localFont({
  src: "./fonts/Vazirmatn-Regular.woff2",
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["Tahoma", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Autonomous Marketing SaaS | Multi-language B2B Platform",
  description:
    "Multi-tenant lead generation, AI enrichment, CRM, and email marketing platform. Supports 20 languages with full RTL.",
  keywords: [
    "Marketing SaaS",
    "Lead Generation",
    "AI Agents",
    "Multi-tenant",
    "Next.js",
    "Prisma",
    "Email Marketing",
    "i18n",
  ],
  authors: [{ name: "Expload" }],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  const meta = getLocaleMeta(locale);

  return (
    <html lang={meta.bcp47} dir={meta.direction} suppressHydrationWarning>
      <body
        className={`${vazirmatn.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <I18nProvider initialLocale={locale}>
              <Providers>
                {children}
                <Toaster />
                <Sonner />
              </Providers>
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
