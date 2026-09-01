"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";

type Props = {
  slug: string;
  disabled?: boolean;
  /** "bulat" untuk tombol + di kartu produk, "penuh" untuk tombol lebar di halaman produk. */
  variant?: "bulat" | "penuh";
  label?: string;
};

export function AddButton({ slug, disabled, variant = "bulat", label = "Tambah ke keranjang" }: Props) {
  const { tambah } = useCart();
  const [baruSaja, setBaruSaja] = useState(false);

  function handle() {
    tambah(slug, 1);
    setBaruSaja(true);
    window.setTimeout(() => setBaruSaja(false), 1400);
  }

  if (variant === "bulat") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={disabled}
        aria-label={`${label} — ${slug}`}
        // z-10 menaruh tombol di atas ::after milik stretched link pada kartu.
        className="absolute right-2 bottom-2 z-10 grid h-9 w-9 place-items-center rounded-full bg-jingga text-jingga-ink shadow-float transition disabled:opacity-0 hover:brightness-110 active:scale-95"
      >
        <span aria-hidden className="text-lg leading-none font-semibold">
          {baruSaja ? "✓" : "+"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={disabled}
      className="flex-1 rounded-xl border border-line-2 px-4 py-3 text-sm font-semibold transition hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
    >
      {baruSaja ? "Masuk keranjang ✓" : label}
    </button>
  );
}
