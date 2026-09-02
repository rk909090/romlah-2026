"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Kunjungan halaman untuk perpindahan di dalam aplikasi.
 *
 * Kenapa perlu: gtag dan Meta Pixel mencatat kunjungan pertama saat skripnya
 * dimuat, lalu diam. Next.js berpindah halaman tanpa memuat ulang dokumen,
 * jadi tanpa komponen ini seluruh penjelajahan setelah halaman pertama —
 * katalog, halaman produk, keranjang — tidak pernah tercatat sama sekali.
 *
 * Kunjungan pertama SENGAJA dilewati (`pertama`): kunjungan itu sudah dicatat
 * oleh `gtag('config')` dan `fbq('track','PageView')` di komponen Analytics.
 * Mengirimnya lagi di sini akan menghitung setiap sesi dua kali.
 *
 * Wadah GTM tidak disentuh. Isi wadah itu diatur dari panel GTM, dan bila di
 * sana sudah ada pemicu "History Change", menambah kiriman sendiri dari sini
 * justru membuat angkanya dobel.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Batas menunggu judul halaman.
 *
 * Next memperbarui <title> setelah efek ini berjalan — diukur di peramban,
 * 300–600 ms pada mode pengembangan. Mengirim langsung berarti page_title
 * terkirim kosong atau masih judul halaman sebelumnya, dan laporan "Pages
 * and screens" di GA jadi tidak berguna.
 *
 * Angka penundaan tetap akan rapuh, jadi yang ditunggu adalah perubahan
 * judulnya sendiri. Batas ini cuma jaring pengaman untuk dua halaman yang
 * kebetulan berjudul sama — tanpa itu kunjungannya tidak akan pernah dikirim.
 */
const BATAS_TUNGGU_MS = 2000;

export function LacakPindahHalaman() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pertama = useRef(true);

  const qs = searchParams.toString();

  useEffect(() => {
    if (pertama.current) {
      pertama.current = false;
      return;
    }

    const jalur = qs ? `${pathname}?${qs}` : pathname;
    const judulLama = document.title;
    let terkirim = false;

    const kirim = () => {
      if (terkirim) return;
      terkirim = true;
      pengamat.disconnect();
      clearTimeout(waktu);

      window.gtag?.("event", "page_view", {
        page_path: jalur,
        page_location: window.location.href,
        page_title: document.title,
      });
      window.fbq?.("track", "PageView");
    };

    const pengamat = new MutationObserver(() => {
      if (document.title !== judulLama) kirim();
    });
    const judul = document.querySelector("title");
    if (judul) pengamat.observe(judul, { childList: true, characterData: true, subtree: true });

    const waktu = setTimeout(kirim, BATAS_TUNGGU_MS);

    return () => {
      // Sengaja TIDAK mengirim saat dibersihkan. Pembersihan berarti
      // pengunjung sudah pindah lagi sebelum judulnya sempat berubah —
      // kalau tetap dikirim, satu perpindahan cepat akan tercatat dua kali,
      // dan angka yang kelebihan lebih menyesatkan daripada yang kurang.
      pengamat.disconnect();
      clearTimeout(waktu);
    };
  }, [pathname, qs]);

  return null;
}
