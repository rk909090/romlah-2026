"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-provider";

/**
 * Dua jalur beli yang dipisah: "+ Keranjang" untuk yang belanja beberapa jenis,
 * "Beli" untuk yang hanya mau satu barang dan langsung ke keranjang.
 */
export function BuyBar({ slug, inStock }: { slug: string; inStock: boolean }) {
  const { tambah } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [masuk, setMasuk] = useState(false);

  if (!inStock) {
    return (
      <div className="rounded-xl border border-line bg-sunken p-4 text-center text-sm text-ink-2">
        Stok sedang habis. Chat kami untuk tahu jadwal restoknya.
      </div>
    );
  }

  function tambahkan() {
    tambah(slug, qty);
    setMasuk(true);
    window.setTimeout(() => setMasuk(false), 1500);
  }

  return (
    // Di layar sempit dua tombol sejajar membuat labelnya terpotong,
    // jadi "Beli" turun ke barisnya sendiri dan sekaligus jadi aksi utama.
    <div className="flex flex-wrap items-stretch gap-2.5">
      <div className="flex items-center gap-1 rounded-xl border border-line-2 px-1">
        <button
          type="button"
          onClick={() => setQty((n) => Math.max(1, n - 1))}
          aria-label="Kurangi jumlah"
          className="grid h-11 w-10 place-items-center text-lg transition hover:text-jingga"
        >
          −
        </button>
        <span className="tabular w-8 text-center text-sm font-semibold" aria-live="polite">
          {qty}
        </span>
        <button
          type="button"
          onClick={() => setQty((n) => Math.min(99, n + 1))}
          aria-label="Tambah jumlah"
          className="grid h-11 w-10 place-items-center text-lg transition hover:text-jingga"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={tambahkan}
        className="min-w-32 flex-1 rounded-xl border border-line-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition hover:bg-sunken"
      >
        {masuk ? "Masuk keranjang ✓" : "+ Keranjang"}
      </button>

      <button
        type="button"
        onClick={() => {
          tambah(slug, qty, { diam: true });
          router.push("/keranjang");
        }}
        className="w-full rounded-xl bg-jingga px-4 py-3.5 text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110 sm:w-auto sm:flex-1"
      >
        Beli
      </button>
    </div>
  );
}
