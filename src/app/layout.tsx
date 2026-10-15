import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, Caveat } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-texto",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fonte-display",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--fonte-caderno",
});

export const metadata: Metadata = {
  title: "RDN Soldas | Toldos",
  description: "Cálculo de lona para toldos e controle de compras",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "RDN Toldos", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#151b23",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${barlow.variable} ${barlowCondensed.variable} ${caveat.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
