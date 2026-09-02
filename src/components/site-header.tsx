"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE } from "@/data/site";
import { useCart } from "./cart-provider";
import { WaButton } from "./wa-button";

/**
 * Ikon menu utama.
 *
 * Digambar sebagai satu path garis, satu gaya untuk semuanya, supaya
 * ketebalan dan sudutnya seragam dengan ikon keranjang di sebelahnya.
 */
const IKON = {
  // Toples camilan: badan, tutup, dan pita label.
  katalog:
    "M7 8h10l-.7 11.1a1 1 0 0 1-1 .9H8.7a1 1 0 0 1-1-.9L7 8Zm-.6-3.2h11.2a.8.8 0 0 1 .8.8v1.6a.8.8 0 0 1-.8.8H6.4a.8.8 0 0 1-.8-.8V5.6a.8.8 0 0 1 .8-.8ZM7.4 13h9.2",
  // Kotak hadiah berpita.
  paket:
    "M3.5 9.5h17v3h-17v-3Zm1 3v7a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-7M12 9.5v11M12 9.5S10.6 4 8.4 4a2 2 0 0 0 0 4m3.6 1.5S13.4 4 15.6 4a2 2 0 0 1 0 4",
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
    ...(paketAktif
      ? [{ href: "/katalog?kategori=paket", label: "Paket", d: IKON.paket }]
      : []),
    { href: "/toko", label: "Toko", d: IKON.toko },
  ];
  const { jumlahItem, ready } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  // Sengaja tidak membaca useSearchParams di sini: header ada di layout, dan
  // membacanya akan memaksa seluruh halaman keluar dari render statis.
  const [q, setQ] = useState("");

  /**
   * Menu geser menyimpan JALUR saat ia dibuka, bukan sekadar true/false.
   *
   * Dengan begitu "tutup sendiri saat pindah halaman" jadi turunan biasa —
   * jalurnya berubah, menunya tertutup — tanpa perlu effect yang memanggil
   * setState dan memicu satu render tambahan tiap kali halaman berganti.
   */
  const [menuDi, setMenuDi] = useState<string | null>(null);
  const menu = menuDi !== null && menuDi === pathname;
  const bukaMenu = () => setMenuDi(pathname);
  const tutupMenu = () => setMenuDi(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuDi(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  function cari(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      q.trim() ? `/katalog?q=${encodeURIComponent(q.trim())}` : "/katalog",
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-5">
          {/* Di ponsel logonya membuka menu geser; di layar lebar ia tetap
            tautan ke beranda, karena di sana menunya sudah kelihatan semua.
            Beranda tetap terjangkau dari ponsel lewat tab bar di bawah. */}
          <button
            type="button"
            onClick={bukaMenu}
            aria-label="Buka menu"
            aria-expanded={menu}
            className="flex shrink-0 items-center gap-1.5 md:hidden"
          >
            <Image
              src="/merek/romlah-logo.png"
              alt=""
              width={116}
              height={110}
              className="h-9 w-auto"
              priority
            />
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-3.5 w-3.5 text-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <Link href="/" className="hidden shrink-0 items-center gap-2 md:flex">
            <Image
              src="/merek/romlah-logo.png"
              alt=""
              width={116}
              height={110}
              className="h-9 w-auto"
            />
            <span className="font-display text-lg leading-none font-extrabold tracking-tight">
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

          {/* Akun hanya di layar lebar: di ponsel ia sudah ada di menu geser,
            dan bilah atasnya terlalu sempit untuk ikon ketiga. */}
          <Link
            href="/akun"
            className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface transition hover:border-line-2 md:grid"
            aria-label="Akun saya"
            title="Akun saya"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </svg>
          </Link>

          <Link
            href="/keranjang"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface transition hover:border-line-2"
            aria-label={`Keranjang${ready && jumlahItem ? `, ${jumlahItem} barang` : ""}`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
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

      {/* ── Menu geser, hanya di ponsel ─────────────────────────────
          Sengaja DI LUAR <header>. Header memakai backdrop-blur, dan
          elemen ber-backdrop-filter menjadi acuan posisi bagi anak
          `position: fixed`-nya — panelnya akan terkurung di dalam bilah
          setinggi 64 piksel dan latar gelapnya tidak menutupi apa pun. */}
      <div className={menu ? "md:hidden" : "hidden"}>
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={tutupMenu}
          className="fixed inset-0 z-40 bg-ink/45"
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu utama"
          className="fixed inset-y-0 left-0 z-50 flex w-[min(19rem,86vw)] flex-col border-r border-line bg-bg shadow-float"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
            <Image
              src="/merek/romlah-logo.png"
              alt=""
              width={116}
              height={110}
              className="h-9 w-auto"
            />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight font-extrabold">
                {SITE.name}
              </p>
              <p className="truncate text-[11px] leading-tight text-muted">
                {SITE.tagline}
              </p>
            </div>
            <button
              type="button"
              onClick={tutupMenu}
              aria-label="Tutup menu"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition hover:bg-sunken"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-sunken"
            >
              <IkonNav d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" />
              Beranda
            </Link>

            {/* Menu yang sama persis dengan tampilan layar lebar. */}
            {nav.map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-sunken"
              >
                <IkonNav d={n.d} />
                {n.label}
              </Link>
            ))}

            <Link
              href="/akun"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-sunken"
            >
              <IkonNav d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              Akun saya
            </Link>

            <Link
              href="/keranjang"
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-sunken"
            >
              <IkonNav d="M6 7h12l-1 12H7L6 7Zm3.5 0a2.5 2.5 0 0 1 5 0" />
              Keranjang
              {ready && jumlahItem > 0 && (
                <span className="tabular ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-jingga px-1 text-[11px] font-bold text-jingga-ink">
                  {jumlahItem}
                </span>
              )}
            </Link>
          </nav>

          <div className="border-t border-line p-4">
            <WaButton
              pesan="Halo Romlah, saya mau tanya-tanya soal oleh-oleh."
              sumber="lain"
            >
              Chat kami
            </WaButton>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              {SITE.outlets[0].name}
              <br />
              {SITE.outlets[0].hours}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
