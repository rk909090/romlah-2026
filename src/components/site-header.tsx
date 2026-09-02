"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE } from "@/data/site";
import { useCart } from "./cart-provider";

/**
 * Ikon menu utama.
 *
 * Digambar sebagai satu path garis, satu gaya untuk semuanya, supaya
 * ketebalan dan sudutnya seragam dengan ikon keranjang di sebelahnya.
 */
const IKON = {
  // Toples camilan: badan, tutup, dan pita label.
  katalog: "M7 8h10l-.7 11.1a1 1 0 0 1-1 .9H8.7a1 1 0 0 1-1-.9L7 8Zm-.6-3.2h11.2a.8.8 0 0 1 .8.8v1.6a.8.8 0 0 1-.8.8H6.4a.8.8 0 0 1-.8-.8V5.6a.8.8 0 0 1 .8-.8ZM7.4 13h9.2",
  // Kotak hadiah berpita.
  paket: "M3.5 9.5h17v3h-17v-3Zm1 3v7a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-7M12 9.5v11M12 9.5S10.6 4 8.4 4a2 2 0 0 0 0 4m3.6 1.5S13.4 4 15.6 4a2 2 0 0 1 0 4",
  // Etalase toko: kanopi, badan, dan pintu.
  toko: "M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5M3 9.5 4.8 5a1 1 0 0 1 .9-.6h12.6a1 1 0 0 1 .9.6L21 9.5a2.5 2.5 0 0 1-4.5 1.6 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 9.5ZM10 20v-4.5h4V20",
} as const;

function IkonNav({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[18px] w-[18px] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function SiteHeader({ paketAktif }: { paketAktif: boolean }) {
  // Tautan Paket ikut hilang selama kategorinya dimatikan dari panel
  // Marketing — tautan ke kategori mati cuma jalan buntu.
  const nav = [
    { href: "/katalog", label: "Katalog", d: IKON.katalog },
    ...(paketAktif ? [{ href: "/katalog?kategori=paket", label: "Paket", d: IKON.paket }] : []),
    { href: "/toko", label: "Toko", d: IKON.toko },
  ];
  const { jumlahItem, ready } = useCart();
  const router = useRouter();
  // Sengaja tidak membaca useSearchParams di sini: header ada di layout, dan
  // membacanya akan memaksa seluruh halaman keluar dari render statis.
  const [q, setQ] = useState("");

  function cari(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image src="/merek/romlah-logo.png" alt="" width={116} height={110} className="h-9 w-auto" priority />
          <span className="font-display hidden text-lg leading-none font-extrabold tracking-tight sm:block">
            {SITE.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium text-ink-2 md:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition hover:bg-sunken hover:text-jingga"
            >
              <IkonNav d={n.d} />
              {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={cari} className="ml-auto min-w-0 flex-1 md:max-w-xs">
          <label className="sr-only" htmlFor="cari-produk">
            Cari produk
          </label>
          <input
            id="cari-produk"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari dodol, kue satu…"
            className="w-full rounded-full border border-line bg-surface px-4 py-2 text-sm placeholder:text-muted focus:border-jingga focus:outline-none"
          />
        </form>

        <Link
          href="/keranjang"
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface transition hover:border-line-2"
          aria-label={`Keranjang${ready && jumlahItem ? `, ${jumlahItem} barang` : ""}`}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 7h12l-1 12H7L6 7Z" strokeLinejoin="round" />
            <path d="M9.5 7a2.5 2.5 0 0 1 5 0" strokeLinecap="round" />
          </svg>
          {ready && jumlahItem > 0 && (
            <span className="tabular absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-jingga px-1 text-[11px] font-bold text-jingga-ink">
              {jumlahItem}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
