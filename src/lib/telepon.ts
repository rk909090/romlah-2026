/**
 * Nomor telepon — pembakuan dan tampilannya.
 *
 * Berdiri sendiri tanpa mengimpor apa pun. Sebelumnya fungsi-fungsi ini
 * tinggal di lib/admin/customers.ts yang menyentuh mysql2, sehingga komponen
 * "use client" tidak bisa memakainya sama sekali — padahal kolom isian nomor
 * justru hidup di sisi klien.
 */

/**
 * Samakan bentuk nomor telepon Indonesia.
 *
 * "0812-3456-7890", "+62 812 3456 7890", dan "62812345678 90" harus menunjuk
 * orang yang sama, kalau tidak satu pembeli akan tercatat sebagai beberapa
 * pelanggan berbeda dan riwayatnya pecah.
 *
 * Bentuk baku: hanya angka, berawalan 62.
 */
export function normalkanTelepon(mentah: string): string {
  const n = mentah.replace(/\D/g, "");
  if (n.startsWith("62")) return n;
  if (n.startsWith("0")) return "62" + n.slice(1);
  if (n.startsWith("8")) return "62" + n; // orang sering menulis tanpa nol depan
  return n;
}

/** Tampilkan sebagai +62 812-3456-7890. */
export function tampilkanTelepon(baku: string): string {
  if (!baku.startsWith("62")) return baku;
  const sisa = baku.slice(2);
  const p = sisa.match(/^(\d{3})(\d{3,4})(\d{0,6})$/);
  return p ? `+62 ${p[1]}-${p[2]}${p[3] ? "-" + p[3] : ""}` : `+${baku}`;
}

/**
 * Batas panjang kolom isian nomor.
 *
 * Nomor Indonesia terpanjang 13 digit setelah kode negara; 15 memberi ruang
 * untuk yang menulis lengkap dengan 62 di depan tanpa memotong nomor yang sah.
 */
export const MAKS_DIGIT_TELEPON = 15;

/**
 * Saring ketikan di kolom nomor: hanya angka yang lolos.
 *
 * Dipakai di onChange, bukan cuma inputMode="numeric". inputMode hanya
 * memilihkan papan ketik di ponsel — di komputer huruf tetap bisa diketik,
 * dan `<input type="tel">` memang MENGIZINKAN huruf menurut spesifikasinya.
 *
 * Tanda plus, spasi, dan tanda hubung ikut dibuang: normalkanTelepon() toh
 * membuangnya juga, jadi lebih baik pengetiknya langsung melihat bentuk yang
 * akan tersimpan daripada dikejutkan belakangan.
 */
export function saringAngka(mentah: string, maks = MAKS_DIGIT_TELEPON): string {
  return mentah.replace(/\D/g, "").slice(0, maks);
}

/**
 * Apakah nomornya masuk akal sebagai nomor Indonesia.
 *
 * Sengaja longgar: memvalidasi awalan operator satu per satu berarti nomor
 * dari operator baru ditolak tanpa alasan. Yang diperiksa hanya panjangnya
 * setelah dibakukan.
 */
export function teleponSah(mentah: string): boolean {
  const n = normalkanTelepon(mentah);
  return /^62\d{8,13}$/.test(n);
}
