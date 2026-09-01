"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SITE } from "@/data/site";
import { useCart } from "./cart-provider";

const NAV = [
  { href: "/katalog", label: "Katalog" },
  { href: "/katalog?kategori=paket", label: "Paket" },
  { href: "/toko", label: "Toko" },
];

export function SiteHeader() {
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

        <nav className="hidden items-center gap-5 text-sm font-medium text-ink-2 md:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="transition hover:text-jingga">
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
