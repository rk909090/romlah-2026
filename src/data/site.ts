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
      hours: "Senin–Minggu, 09.00–17.00",
      isOpen: true,
    },
  ],

  marketplace: {
    tokopedia: "https://www.tokopedia.com/romlah",
  },

  maps: "https://maps.app.goo.gl/ybceaT9pJkZgYQLK9",
} as const;

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

/** Ambang gratis ongkir — angka sementara, menunggu data rata-rata nilai pesanan. */
export const GRATIS_ONGKIR_MIN = 250_000;
