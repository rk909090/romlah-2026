import { Analytics } from "@/components/analytics";
import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/components/cart-provider";
import { MiniCart } from "@/components/mini-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { kategoriAktif } from "@/lib/catalog";

/** Chrome toko: header, footer, tab bar, dan keranjang. Tidak dipakai admin. */
export default async function TokoLayout({ children }: LayoutProps<"/">) {
  // Kategori Paket bisa dimatikan dari panel Marketing. Saat mati, tautan
  // ke Paket harus ikut hilang dari menu dan tab bar — bukan cuma isinya
  // yang kosong, karena tautan ke kategori mati adalah tautan buntu.
  //
  // Dibaca di layout supaya menu dan tab bar (keduanya komponen klien)
  // tidak perlu menyentuh basis data sendiri. Kuerinya dibagi dengan
  // halaman di bawahnya lewat cache() di lib/catalog.
  const paketAktif = await kategoriAktif("paket");

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader paketAktif={paketAktif} />
        {/* Ruang bawah menghindari tab bar yang menempel di layar kecil. */}
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <SiteFooter paketAktif={paketAktif} />
        <BottomNav paketAktif={paketAktif} />
        <MiniCart />
      </div>
      <Analytics />
    </CartProvider>
  );
}
