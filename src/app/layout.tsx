import type { Metadata } from "next";
import { Gabarito, Plus_Jakarta_Sans } from "next/font/google";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/components/cart-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${jakarta.variable} ${gabarito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <SiteHeader />
          {/* Ruang bawah menghindari tab bar yang menempel di layar kecil. */}
          <main className="flex-1 pb-24 md:pb-0">{children}</main>
          <SiteFooter />
          <BottomNav />
        </CartProvider>
      </body>
    </html>
  );
}
