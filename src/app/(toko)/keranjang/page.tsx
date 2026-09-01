import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { getProducts } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Keranjang",
  robots: { index: false },
};

// Katalog dibaca dari basis data saat permintaan; build tidak menyentuh DB.
export const dynamic = "force-dynamic";

export default async function Keranjang() {
  // Katalog dikirim sekali dari server; keranjang sendiri hidup di browser
  // sampai database aktif.
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display mb-6 text-3xl font-extrabold tracking-tight sm:text-4xl">Keranjang</h1>
      <CartView products={products} />
    </div>
  );
}
