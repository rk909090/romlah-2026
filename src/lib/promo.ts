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

/** Satu slide di deretan banner beranda. Perbandingan gambarnya 16:9. */
export type Slide = {
  /** Alamat gambar: diawali "/" untuk berkas di situs ini, atau http(s). */
  gambar: string;
  /** Teks pengganti gambar. Wajib — tanpa ini pembaca layar tidak dapat apa-apa. */
  alt: string;
  judul: string;
  teks: string;
  tautan: string;
  /** Teks tombol. Kosong = tidak ada tombol, tapi seluruh slide tetap bisa diklik. */
  tombol: string;
};

export type Slider = {
  aktif: boolean;
  slides: Slide[];
};

export const SLIDE_KOSONG: Slide = {
  gambar: "", alt: "", judul: "", teks: "", tautan: "", tombol: "",
};

/** Lebih dari ini tidak akan pernah dilihat orang, dan memberatkan beranda. */
export const MAKS_SLIDE = 6;

export type Pengaturan = {
  gratisOngkir: GratisOngkir;
  checkout: Checkout;
  banner: Banner;
  slider: Slider;
};

/**
 * Alamat gambar dan tautan yang boleh dipakai.
 *
 * Hanya berkas di situs ini ("/…") atau http(s). Tanpa saringan ini,
 * `javascript:` bisa masuk lewat panel admin dan dijalankan di peramban
 * pengunjung.
 */
export const tautanAman = (v: string): boolean => /^(\/|https?:\/\/)/i.test(v.trim());

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
  slider: { aktif: false, slides: [] },
};

/**
 * Bersihkan daftar slide yang dibaca dari basis data.
 *
 * Isinya larik objek, jadi pemeriksaan tipe per bidang yang dipakai
 * pengaturan lain tidak cukup — satu baris rusak bisa membuat beranda
 * merender atribut src yang tidak masuk akal. Slide yang tidak lolos DIBUANG,
 * bukan menjatuhkan seluruh pengaturan.
 */
export function bersihkanSlides(mentah: unknown): Slide[] {
  if (!Array.isArray(mentah)) return [];
  const hasil: Slide[] = [];
  for (const s of mentah.slice(0, MAKS_SLIDE)) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const teks = (k: string) => (typeof o[k] === "string" ? (o[k] as string).trim() : "");
    const gambar = teks("gambar");
    if (!gambar || !tautanAman(gambar)) continue;
    const tautan = teks("tautan");
    hasil.push({
      gambar,
      alt: teks("alt").slice(0, 200),
      judul: teks("judul").slice(0, 120),
      teks: teks("teks").slice(0, 200),
      tautan: tautan && tautanAman(tautan) ? tautan : "",
      tombol: teks("tombol").slice(0, 40),
    });
  }
  return hasil;
}

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
