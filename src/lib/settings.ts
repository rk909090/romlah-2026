import { cache } from "react";
import { execute, query } from "./db";
import { BAWAAN, type Pengaturan } from "./promo";

// Diteruskan lagi supaya pemanggil di sisi server cukup mengimpor satu
// modul. Komponen "use client" WAJIB mengimpor dari ./promo, bukan dari
// sini — berkas ini menyentuh mysql2.
export {
  BAWAAN,
  kurangGratisOngkir,
  memenuhiGratisOngkir,
  ongkirSetelahProgram,
} from "./promo";
export type { Banner, Checkout, GratisOngkir, Pengaturan } from "./promo";

/**
 * Pengaturan toko yang bisa diubah dari panel admin.
 *
 * Disimpan sebagai kunci–nilai berisi JSON, bukan kolom tetap: program
 * pemasaran datang dan pergi, dan menambah program baru tidak boleh berarti
 * migrasi skema lagi.
 *
 * Setiap pembacaan SELALU digabung dengan nilai bawaan di bawah, jadi baris
 * yang belum pernah ditulis — atau yang isinya rusak — tidak pernah membuat
 * toko berhenti. Nilai bawaannya adalah perilaku yang berlaku sebelum
 * pengaturan ini ada.
 */

const KUNCI = {
  gratisOngkir: "gratis_ongkir",
  checkout: "checkout",
  banner: "banner",
} as const satisfies Record<keyof Pengaturan, string>;

const KE_BIDANG = Object.fromEntries(
  Object.entries(KUNCI).map(([bidang, kunci]) => [kunci, bidang as keyof Pengaturan]),
) as Record<string, keyof Pengaturan>;

/** Gabungkan JSON tersimpan dengan bawaannya, per bidang, dengan tipe dijaga. */
function gabung<T extends object>(bawaan: T, tersimpan: unknown): T {
  if (!tersimpan || typeof tersimpan !== "object" || Array.isArray(tersimpan)) return bawaan;
  const hasil = { ...bawaan };
  for (const [k, v] of Object.entries(tersimpan)) {
    if (!(k in bawaan)) continue;
    const jenisBawaan = typeof bawaan[k as keyof T];
    // Tipe nilai tersimpan harus cocok dengan bawaannya. Baris yang rusak
    // atau ketinggalan versi diabaikan per bidang, bukan menjatuhkan
    // seluruh pengaturan.
    if (typeof v === jenisBawaan) (hasil as Record<string, unknown>)[k] = v;
  }
  return hasil;
}

/**
 * Baca seluruh pengaturan.
 *
 * Dibungkus cache() React: dipanggil layout toko, halaman keranjang, dan
 * lapisan pesanan dalam satu permintaan yang sama. Kuota Hostinger cuma 100
 * koneksi bersamaan, jadi tiga kueri untuk jawaban yang sama itu mahal.
 */
export const getPengaturan = cache(async function getPengaturan(): Promise<Pengaturan> {
  let baris: { setting_key: string; value: string }[] = [];
  try {
    baris = await query<{ setting_key: string; value: string }>(
      `SELECT setting_key, value FROM settings`,
    );
  } catch (e) {
    // Tabelnya belum ada (skema belum diterapkan) bukan alasan toko tutup.
    console.error("[getPengaturan]", e);
    return BAWAAN;
  }

  const hasil: Pengaturan = {
    gratisOngkir: { ...BAWAAN.gratisOngkir },
    checkout: { ...BAWAAN.checkout },
    banner: { ...BAWAAN.banner },
  };

  for (const b of baris) {
    const bidang = KE_BIDANG[b.setting_key];
    if (!bidang) continue;
    let isi: unknown;
    try {
      isi = JSON.parse(b.value);
    } catch {
      continue;
    }
    // @ts-expect-error — bidang menentukan bentuknya, dan gabung() menjaga
    // setiap nilai tetap bertipe sama dengan bawaannya.
    hasil[bidang] = gabung(BAWAAN[bidang], isi);
  }

  return hasil;
});

export async function simpanPengaturan<K extends keyof Pengaturan>(
  bidang: K,
  nilai: Pengaturan[K],
): Promise<void> {
  await execute(
    `INSERT INTO settings (setting_key, value) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
    [KUNCI[bidang], JSON.stringify(nilai)],
  );
}
