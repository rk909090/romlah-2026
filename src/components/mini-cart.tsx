"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GRATIS_ONGKIR_MIN } from "@/data/site";
import { berat, rupiah } from "@/lib/format";
import { useCart } from "./cart-provider";

/**
 * Keranjang mini — panel yang menggeser masuk begitu barang ditambahkan.
 *
 * Sebelumnya satu-satunya tanda bahwa penambahan berhasil adalah angka kecil
 * di ikon keranjang pojok kanan atas; di layar ponsel angka itu praktis tidak
 * terlihat. Panel ini memperlihatkan barang yang baru masuk, isi keranjang,
 * dan jalan keluar ke pembayaran.
 *
 * Datang dari kanan, bukan kiri: ikon keranjang ada di kanan atas dan tab
 * keranjang ada di kanan bawah, jadi panelnya muncul dari arah yang sama
 * dengan tempat isinya nanti dicari.
 *
 * Nama, harga, dan foto diambil dari /api/produk saat panel pertama dibuka.
 * Keranjang di localStorage hanya menyimpan slug dan jumlah.
 */

type Ringkas = {
  slug: string;
  name: string;
  price: number;
  weightGram: number;
  inStock: boolean;
  image: { src: string; alt: string } | null;
};

export function MiniCart() {
  const { lines, miniBuka, miniTerakhir, tutupMini, ubahQty, jumlahItem } = useCart();
  const pathname = usePathname();
  const [produk, setProduk] = useState<Record<string, Ringkas>>({});
  const tombolTutup = useRef<HTMLButtonElement>(null);

  const terbuka = miniBuka && pathname !== "/keranjang";

  // Tutup sendiri begitu pindah halaman — panel yang menggantung setelah
  // navigasi menutupi halaman baru tanpa alasan.
  useEffect(() => {
    tutupMini();
    // Sengaja hanya bergantung pada pathname: efek ini adalah reaksi atas
    // perpindahan halaman, bukan atas berubahnya fungsi tutupMini.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Ambil data produk untuk slug yang belum dikenal.
  useEffect(() => {
    if (!terbuka) return;
    const kurang = lines.map((l) => l.slug).filter((s) => !(s in produk));
    if (kurang.length === 0) return;

    // Tidak ada bendera "sedang memuat" tersendiri: baris yang datanya belum
    // sampai dikenali dari p yang masih kosong, dan itu sudah cukup.
    let batal = false;
    fetch(`/api/produk?slugs=${encodeURIComponent(kurang.join(","))}`)
      .then((r) => r.json())
      .then((j: { data?: Ringkas[] }) => {
        if (batal) return;
        setProduk((p) => {
          const next = { ...p };
          for (const d of j.data ?? []) next[d.slug] = d;
          return next;
        });
      })
      .catch(() => {
        // Panel tetap terbuka dengan rangka kosong; keranjangnya sendiri utuh.
      });

    return () => {
      batal = true;
    };
  }, [terbuka, lines, produk]);

  // Esc menutup panel, dan fokus dipindahkan ke tombol tutup saat dibuka.
  useEffect(() => {
    if (!terbuka) return;
    tombolTutup.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutupMini();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [terbuka, tutupMini]);

  const baris = lines.map((l) => ({ ...l, p: produk[l.slug] }));
  const subtotal = baris.reduce((n, b) => n + (b.p ? b.p.price * b.qty : 0), 0);
  const lengkap = baris.every((b) => b.p);
  const kurangGratis = Math.max(0, GRATIS_ONGKIR_MIN - subtotal);
  const baru = miniTerakhir ? produk[miniTerakhir] : undefined;

  return (
    <>
      {/* Latar gelap. aria-hidden karena tombol tutup di dalam panel sudah
          menyediakan jalan keluar yang bisa diakses papan ketik. */}
      <div
        aria-hidden
        onClick={tutupMini}
        className={`fixed inset-0 z-50 bg-ink/35 transition-opacity duration-200 ${
          terbuka ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Barang ditambahkan ke keranjang"
        aria-hidden={!terbuka}
        className={`fixed top-0 right-0 z-50 flex h-dvh w-[min(24rem,92vw)] flex-col border-l border-line bg-bg shadow-float transition-transform duration-300 ease-out ${
          terbuka ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-pandan-soft text-pandan">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold">Masuk keranjang</p>
            <p className="truncate text-xs text-muted">
              {baru ? baru.name : jumlahItem > 0 ? `${jumlahItem} barang di keranjang` : "Keranjang kosong"}
            </p>
          </div>
          <button
            ref={tombolTutup}
            type="button"
            onClick={tutupMini}
            aria-label="Tutup keranjang mini"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line transition hover:bg-sunken"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {baris.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Keranjang masih kosong.</p>
          ) : (
            <ul className="space-y-3">
              {baris.map((b) => (
                <li
                  key={b.slug}
                  className={`flex gap-3 rounded-xl border p-3 transition ${
                    b.slug === miniTerakhir ? "border-jingga bg-jingga-soft" : "border-line bg-surface"
                  }`}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sunken">
                    {b.p?.image && (
                      <Image src={b.p.image.src} alt="" fill sizes="56px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {b.p ? (
                      <>
                        <p className="truncate text-sm font-semibold">{b.p.name}</p>
                        <p className="text-xs text-muted">{berat(b.p.weightGram)}</p>
                      </>
                    ) : (
                      <>
                        <span className="block h-3.5 w-3/4 rounded bg-sunken" />
                        <span className="mt-1.5 block h-2.5 w-1/3 rounded bg-sunken" />
                      </>
                    )}
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 rounded-lg border border-line">
                        <button
                          type="button"
                          onClick={() => ubahQty(b.slug, b.qty - 1)}
                          aria-label={`Kurangi ${b.p?.name ?? b.slug}`}
                          className="grid h-7 w-7 place-items-center text-base leading-none transition hover:text-jingga"
                        >
                          −
                        </button>
                        <span className="tabular w-6 text-center text-xs font-semibold">{b.qty}</span>
                        <button
                          type="button"
                          onClick={() => ubahQty(b.slug, b.qty + 1)}
                          aria-label={`Tambah ${b.p?.name ?? b.slug}`}
                          className="grid h-7 w-7 place-items-center text-base leading-none transition hover:text-jingga"
                        >
                          +
                        </button>
                      </div>
                      <p className="tabular text-sm font-bold">{b.p ? rupiah(b.p.price * b.qty) : "—"}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {baris.length > 0 && (
          <footer className="border-t border-line px-5 py-4">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-2">Subtotal</span>
              {/* Angka disembunyikan sampai SEMUA baris punya harganya, supaya
                  panel tidak sempat memperlihatkan subtotal yang keliru. */}
              <span className="tabular text-lg font-extrabold">{lengkap ? rupiah(subtotal) : "…"}</span>
            </div>

            {lengkap && (
              <p className="mt-1 text-xs text-muted">
                {kurangGratis > 0
                  ? `Belanja ${rupiah(kurangGratis)} lagi untuk gratis ongkir.`
                  : "Sudah dapat gratis ongkir."}
              </p>
            )}

            <Link
              href="/keranjang"
              onClick={tutupMini}
              className="mt-3 block rounded-xl bg-jingga px-5 py-3.5 text-center text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110"
            >
              Lihat keranjang · {jumlahItem} barang
            </Link>
            <button
              type="button"
              onClick={tutupMini}
              className="mt-2 w-full rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
            >
              Lanjut belanja
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
