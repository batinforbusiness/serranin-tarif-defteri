import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeClient } from "@/components/theme-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Serra'nın Tarif Defteri",
  description: "Linkten tarif çıkaran, kaydeden ve alışveriş listesi oluşturan kişisel tarif defteri.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/serra-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/serra-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icons/serra-icon-180.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Serra'nın Tarif Defteri"
  }
};

export const viewport: Viewport = {
  themeColor: "#fffaf1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>
        <ThemeClient />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
