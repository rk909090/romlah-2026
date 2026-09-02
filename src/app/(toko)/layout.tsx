import { BottomNav } from "@/components/bottom-nav";
import { CartProvider } from "@/components/cart-provider";
import { MiniCart } from "@/components/mini-cart";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/** Chrome toko: header, footer, tab bar, dan keranjang. Tidak dipakai admin. */
export default function TokoLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        {/* Ruang bawah menghindari tab bar yang menempel di layar kecil. */}
        <main className="flex-1 pb-24 md:pb-0">{children}</main>
        <SiteFooter />
        <BottomNav />
        <MiniCart />
      </div>
    </CartProvider>
  );
}
