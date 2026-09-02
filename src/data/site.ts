import type { Testimonial } from "@/lib/types";

/** Semua isian di bawah diambil dari situs romlah.com yang sedang berjalan. */
export const SITE = {
  name: "Romlah",
  tagline: "Oleh-oleh khas Betawi",
  description:
    "Rumah oleh-oleh khas Jakarta. Dodol, kue satu, bir pletok, dan puluhan camilan Betawi lain, dibuat rumahan di Tanjung Barat.",
  url: "https://romlah.com",

  whatsapp: {
    /** Format internasional tanpa tanda plus — dipakai untuk tautan wa.me. */
    number: "628111814342",
    display: "+62 811-1814-342",
  },
  phone: "021-7814342",
  email: "info.romlah@gmail.com",

  /**
   * Outlet fisik yang benar-benar melayani.
   *
   * Gerai Harmonie Exchange Mall dan Ibis Kemayoran sudah tidak beroperasi
   * dan dihapus atas permintaan pemilik. Bendera isOpen dipertahankan supaya
   * gerai yang suatu saat tutup sementara bisa ditandai tanpa dihapus.
   */
  outlets: [
    {
      name: "Swadaya Tanjung Barat",
      address: "Jl. Swadaya 2 No. 20B, Tanjung Barat, Jakarta Selatan 12530",
      hours: "Senin–Minggu, 08.00–20.00",
      isOpen: true,
    },
  ],

  marketplace: {
    tokopedia: "https://www.tokopedia.com/romlah",
  },

  maps: "https://maps.app.goo.gl/ybceaT9pJkZgYQLK9",
} as const;

/**
 * Kode pelacakan, disalin dari romlah.com yang sedang berjalan.
 *
 * Diperiksa langsung di peramban terhadap situs live, bukan dikira-kira dari
 * kode sumbernya saja — WordPress memasang sebagian tag lewat JavaScript,
 * jadi HTML mentah tidak memperlihatkan semuanya. Yang benar-benar terpanggil:
 *
 *   1. Google tag GT-NNMKF9C  (gtag.js, dipasang Google Site Kit)
 *        └─ meneruskan ke GA4 G-Z1NM0E5YWZ
 *   2. Google Tag Manager GTM-NDPM87HT
 *        ├─ GA4 G-H5827SJTLT
 *        ├─ Google Ads AW-958729191
 *        └─ Meta Pixel 4070720943181637
 *   3. Meta Pixel 391047905266240  (dipasang plugin PixelYourSite)
 *
 * Yang dipasang di sini hanya nomor 1, 2, dan 3. Isi wadah GTM (GA4
 * G-H5827SJTLT, Google Ads, dan pixel kedua) ikut terbawa sendirinya —
 * memasangnya lagi secara terpisah akan membuat setiap kunjungan terhitung
 * dua kali.
 *
 * Semua ID di bawah ini memang publik: siapa pun bisa membacanya dari kode
 * sumber romlah.com. Bukan rahasia, jadi tidak perlu disimpan di .env —
 * tapi tetap bisa ditimpa lewat variabel lingkungan untuk staging.
 */
export const ANALYTICS = {
  gtm: process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-NDPM87HT",
  googleTag: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID ?? "GT-NNMKF9C",
  metaPixel: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "391047905266240",
} as const;

/**
 * Pelacakan dimatikan kecuali di produksi.
 *
 * Tanpa ini, setiap `pnpm dev` dan setiap uji di peramban ikut masuk ke
 * laporan GA dan mengotori datanya.
 *
 *   NEXT_PUBLIC_ANALYTICS=off  mematikannya juga di produksi, misalnya saat
 *                              situs masih dalam masa uji coba.
 *   NEXT_PUBLIC_ANALYTICS=on   menyalakannya di luar produksi. Hanya untuk
 *                              memeriksa pemasangannya, dan WAJIB dipasangkan
 *                              dengan ID palsu lewat NEXT_PUBLIC_GTM_ID dan
 *                              kawan-kawan — kalau tidak, data uji ikut masuk
 *                              ke laporan yang sungguhan.
 */
export const analitikAktif =
  process.env.NEXT_PUBLIC_ANALYTICS === "on" ||
  (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_ANALYTICS !== "off");

/**
 * Testimoni pelanggan.
 *
 * SENGAJA KOSONG. Romlah hanya punya ulasan di Google Maps, dan ulasan itu
 * belum ditarik ke sini. Google Places API tidak bisa menyaring per bintang
 * dan melarang penyimpanan isi ulasan; jalur yang sah adalah Google Business
 * Profile API, yang masih menunggu persetujuan akses.
 *
 * Sampai salah satunya tersedia, bagian testimoni tidak dirender sama sekali —
 * lebih baik kosong daripada diisi kutipan karangan. Isi larik ini (lewat
 * panel admin setelah database aktif) dan bagiannya muncul dengan sendirinya.
 */
export const TESTIMONIALS: Testimonial[] = [];

// Ambang gratis ongkir sudah pindah ke basis data dan diatur dari
// /admin/marketing/ongkir. Nilai bawaannya ada di lib/promo.ts.
