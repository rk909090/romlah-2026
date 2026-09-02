/**
 * Bentuk dan aturan program pemasaran — tanpa basis data.
 *
 * Sengaja berdiri sendiri tanpa mengimpor apa pun, seperti order-status.ts dan
 * lead-status.ts. Halaman keranjang adalah komponen "use client", dan
 * mengimpor aturan ini dari lib/settings.ts akan menyeret mysql2 ke bundel
 * peramban — yang langsung gagal dibangun karena mysql2 memakai `net` dan `tls`.
 */

export type GratisOngkir = {
  aktif: boolean;
  /** Subtotal minimal (rupiah) agar ongkir digratiskan. */
  minBelanja: number;
  /**
   * Batas rupiah yang ditanggung toko. 0 = tanpa batas.
   *
   * Ini bukan hiasan: kiriman ke Papua bisa jauh lebih mahal daripada
   * marginnya. Di atas batas ini pembeli membayar selisihnya.
   */
  maksPotongan: number;
  /** Kalimat yang tampil di keranjang. Kosong = pakai kalimat bawaan. */
  pesan: string;
};

export type Checkout = {
  /** Tombol "Pesan lewat WhatsApp" di halaman keranjang. */
  tombolWa: boolean;
};

export type Banner = {
  aktif: boolean;
  teks: string;
  /** Opsional. Kosong = banner tidak bisa diklik. */
  tautan: string;
};

export type Pengaturan = {
  gratisOngkir: GratisOngkir;
  checkout: Checkout;
  banner: Banner;
};

/**
 * Nilai bawaan.
 *
 * `minBelanja` 250.000 mengikuti konstanta GRATIS_ONGKIR_MIN yang dipakai
 * sebelum pengaturan ini ada, supaya perilaku toko tidak berubah diam-diam
 * saat kode ini dipasang.
 */
export const BAWAAN: Pengaturan = {
  gratisOngkir: { aktif: true, minBelanja: 250_000, maksPotongan: 0, pesan: "" },
  checkout: { tombolWa: true },
  banner: { aktif: false, teks: "", tautan: "" },
};

/**
 * Ongkir setelah program gratis ongkir diterapkan.
 *
 * Satu-satunya tempat aturannya dihitung. Halaman keranjang dan penyimpan
 * pesanan sama-sama memanggil ini, supaya angka di layar dan angka yang
 * ditagihkan tidak mungkin berbeda.
 */
export function ongkirSetelahProgram(
  ongkirAsli: number,
  subtotal: number,
  g: GratisOngkir,
  ambilDiToko = false,
): number {
  if (ambilDiToko) return 0;
  if (!g.aktif) return ongkirAsli;
  if (subtotal < g.minBelanja) return ongkirAsli;
  // maksPotongan 0 berarti tanpa batas: toko menanggung seluruhnya.
  if (g.maksPotongan <= 0) return 0;
  return Math.max(0, ongkirAsli - g.maksPotongan);
}

/** Apakah pesanan sebesar ini sudah memenuhi syarat program. */
export const memenuhiGratisOngkir = (subtotal: number, g: GratisOngkir): boolean =>
  g.aktif && subtotal >= g.minBelanja;

/** Sisa belanja menuju gratis ongkir. 0 bila sudah terpenuhi atau program mati. */
export const kurangGratisOngkir = (subtotal: number, g: GratisOngkir): number =>
  g.aktif ? Math.max(0, g.minBelanja - subtotal) : 0;
