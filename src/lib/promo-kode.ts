/**
 * Aturan kode promo — tanpa basis data.
 *
 * Berdiri sendiri tanpa mengimpor apa pun, seperti promo.ts dan
 * order-status.ts: halaman keranjang adalah komponen "use client", dan
 * mengimpor aturan ini dari modul yang menyentuh mysql2 akan menyeret
 * seluruh pustaka basis data ke bundel peramban.
 */

export const JENIS_PROMO = ["persen", "nominal", "ongkir"] as const;
export type JenisPromo = (typeof JENIS_PROMO)[number];

export const LABEL_JENIS: Record<JenisPromo, string> = {
  persen: "Potongan persen dari belanja",
  nominal: "Potongan rupiah dari belanja",
  ongkir: "Potongan ongkir",
};

/** Bentuk kode promo yang cukup untuk menghitung, tanpa kolom administratif. */
export type AturanPromo = {
  code: string;
  jenis: JenisPromo;
  nilai: number;
  minBelanja: number;
  /** 0 = tanpa batas. */
  maksPotongan: number;
};

export type HasilPromo = {
  /** Potongan atas harga barang. */
  diskonBarang: number;
  /** Potongan atas ongkir yang tersisa setelah program gratis ongkir. */
  diskonOngkir: number;
  /** Jumlah keduanya — inilah yang disimpan di kolom orders.discount. */
  total: number;
};

export const KOSONG: HasilPromo = { diskonBarang: 0, diskonOngkir: 0, total: 0 };

/** Samakan bentuk kode: huruf besar, tanpa spasi. */
export const normalkanKode = (mentah: string): string =>
  mentah.trim().toUpperCase().replace(/\s+/g, "");

/**
 * Hitung potongan.
 *
 * Satu-satunya tempat aturannya hidup. Halaman keranjang dan penyimpan
 * pesanan sama-sama memanggil ini, jadi angka di layar tidak mungkin berbeda
 * dari yang ditagihkan.
 *
 * `ongkir` yang masuk ke sini sudah nilai SESUDAH program gratis ongkir —
 * urutannya begitu supaya toko tidak menanggung potongan dua kali untuk
 * ongkos yang sama.
 *
 * Potongan tidak pernah melebihi yang dipotongnya: belanja tidak bisa jadi
 * minus, dan ongkir tidak bisa jadi minus.
 */
export function hitungPromo(p: AturanPromo, subtotal: number, ongkir: number): HasilPromo {
  if (subtotal < p.minBelanja) return KOSONG;

  const batas = (n: number) => (p.maksPotongan > 0 ? Math.min(n, p.maksPotongan) : n);

  if (p.jenis === "ongkir") {
    const diskonOngkir = Math.max(0, Math.min(ongkir, batas(p.nilai > 0 ? p.nilai : ongkir)));
    return { diskonBarang: 0, diskonOngkir, total: diskonOngkir };
  }

  const mentah = p.jenis === "persen" ? Math.round((subtotal * p.nilai) / 100) : p.nilai;
  const diskonBarang = Math.max(0, Math.min(subtotal, batas(mentah)));
  return { diskonBarang, diskonOngkir: 0, total: diskonBarang };
}

/** Kalimat singkat yang menjelaskan kodenya, untuk ditampilkan ke pembeli. */
export function ringkasPromo(p: AturanPromo): string {
  const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
  const syarat = p.minBelanja > 0 ? ` (min. belanja ${rp(p.minBelanja)})` : "";

  if (p.jenis === "persen") {
    const batas = p.maksPotongan > 0 ? `, maks. ${rp(p.maksPotongan)}` : "";
    return `Potongan ${p.nilai}%${batas}${syarat}`;
  }
  if (p.jenis === "ongkir") {
    return p.nilai > 0
      ? `Potongan ongkir sampai ${rp(p.nilai)}${syarat}`
      : `Gratis ongkir${syarat}`;
  }
  return `Potongan ${rp(p.nilai)}${syarat}`;
}
