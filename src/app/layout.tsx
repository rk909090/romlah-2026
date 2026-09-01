import type { Metadata } from "next";
import { Gabarito, Plus_Jakarta_Sans } from "next/font/google";
import { SITE } from "@/data/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline} Jakarta`,
    template: `%s — ${SITE.name}`,
  },
  // Situs lama sama sekali tidak punya deskripsi meta; ini menutup celah itu.
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline} Jakarta`,
    description: SITE.description,
  },
};

/**
 * Layout akar sengaja hanya memuat html, body, dan font.
 *
 * Chrome toko (header, footer, tab bar) ada di grup rute (toko), dan panel
 * admin punya kerangkanya sendiri. Tanpa pemisahan ini, halaman admin akan
 * ikut mewarisi header dan keranjang belanja.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} ${gabarito.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
