import { execute, query, queryOne, type SqlParam, type Tx } from "../db";
import {
  hitungPromo,
  JENIS_PROMO,
  normalkanKode,
  type AturanPromo,
  type HasilPromo,
  type JenisPromo,
} from "../promo-kode";

/**
 * Kode promo — pembacaan, penebusan, dan pengelolaan.
 *
 * Aturan hitungannya sendiri ada di lib/promo-kode.ts supaya bisa dipakai
 * halaman keranjang tanpa menyeret mysql2 ke peramban.
 */

export type KodePromo = {
  id: number;
  code: string;
  description: string | null;
  jenis: JenisPromo;
  nilai: number;
  minBelanja: number;
  maksPotongan: number;
  kuota: number | null;
  terpakai: number;
  kuotaPerOrang: number | null;
  mulai: string | null;
  berakhir: string | null;
  isActive: boolean;
  createdAt: string;
};

type Baris = {
  id: number;
  code: string;
  description: string | null;
  jenis: JenisPromo;
  nilai: number;
  min_belanja: number;
  maks_potongan: number;
  kuota: number | null;
  terpakai: number;
  kuota_per_orang: number | null;
  mulai: string | null;
  berakhir: string | null;
  is_active: number;
  created_at: string;
};

const petakan = (b: Baris): KodePromo => ({
  id: b.id,
  code: b.code,
  description: b.description,
  jenis: b.jenis,
  nilai: Number(b.nilai),
  minBelanja: Number(b.min_belanja),
  maksPotongan: Number(b.maks_potongan),
  kuota: b.kuota === null ? null : Number(b.kuota),
  terpakai: Number(b.terpakai),
  kuotaPerOrang: b.kuota_per_orang === null ? null : Number(b.kuota_per_orang),
  mulai: b.mulai,
  berakhir: b.berakhir,
  isActive: b.is_active === 1,
  createdAt: b.created_at,
});

const KOLOM = `id, code, description, jenis, nilai, min_belanja, maks_potongan,
               kuota, terpakai, kuota_per_orang, mulai, berakhir, is_active, created_at`;

export async function listPromo(): Promise<KodePromo[]> {
  const baris = await query<Baris>(
    `SELECT ${KOLOM} FROM promo_codes ORDER BY is_active DESC, created_at DESC`,
  );
  return baris.map(petakan);
}

export async function getPromo(id: number): Promise<KodePromo | undefined> {
  const b = await queryOne<Baris>(`SELECT ${KOLOM} FROM promo_codes WHERE id = ? LIMIT 1`, [id]);
  return b ? petakan(b) : undefined;
}

export async function getPromoByCode(kode: string): Promise<KodePromo | undefined> {
  const b = await queryOne<Baris>(`SELECT ${KOLOM} FROM promo_codes WHERE code = ? LIMIT 1`, [
    normalkanKode(kode),
  ]);
  return b ? petakan(b) : undefined;
}

/* ── Pemeriksaan ─────────────────────────────────────────────────────── */

export type PeriksaGagal = { ok: false; alasan: string };
export type PeriksaLolos = { ok: true; promo: KodePromo; hasil: HasilPromo };
export type Periksa = PeriksaLolos | PeriksaGagal;

const aturan = (p: KodePromo): AturanPromo => ({
  code: p.code,
  jenis: p.jenis,
  nilai: p.nilai,
  minBelanja: p.minBelanja,
  maksPotongan: p.maksPotongan,
});

const rupiah = (n: number) => "Rp " + n.toLocaleString("id-ID");

/**
 * Periksa kode terhadap satu keranjang.
 *
 * TIDAK menebus apa pun — penebusan terjadi di tebusPromo() di dalam
 * transaksi penyimpanan pesanan. Pemisahan ini disengaja: pembeli boleh
 * memeriksa kode berkali-kali tanpa menghabiskan kuotanya.
 *
 * Kuota di sini hanya dipakai untuk memberi pesan lebih cepat; yang mengikat
 * tetap pemeriksaan di dalam transaksi.
 */
export async function periksaPromo(
  kode: string,
  subtotal: number,
  ongkir: number,
  teleponBaku?: string,
): Promise<Periksa> {
  const promo = await getPromoByCode(kode);
  if (!promo) return { ok: false, alasan: "Kode promo tidak dikenal." };
  if (!promo.isActive) return { ok: false, alasan: "Kode promo ini sudah tidak berlaku." };

  const kini = new Date();
  if (promo.mulai && new Date(promo.mulai) > kini) {
    return { ok: false, alasan: "Kode promo ini belum bisa dipakai." };
  }
  if (promo.berakhir && new Date(promo.berakhir) < kini) {
    return { ok: false, alasan: "Kode promo ini sudah kedaluwarsa." };
  }
  if (promo.kuota !== null && promo.terpakai >= promo.kuota) {
    return { ok: false, alasan: "Kuota kode promo ini sudah habis." };
  }
  if (subtotal < promo.minBelanja) {
    return {
      ok: false,
      alasan: `Kode ini berlaku mulai belanja ${rupiah(promo.minBelanja)}. Belanja Anda ${rupiah(subtotal)}.`,
    };
  }

  if (promo.kuotaPerOrang !== null && teleponBaku) {
    const b = await queryOne<{ n: number }>(
      `SELECT COUNT(*) AS n FROM orders
        WHERE promo_code = ? AND customer_phone = ?
          AND status NOT IN ('dibatalkan','kedaluwarsa')`,
      [promo.code, teleponBaku],
    );
    if (Number(b?.n ?? 0) >= promo.kuotaPerOrang) {
      return { ok: false, alasan: "Kode ini sudah pernah Anda pakai." };
    }
  }

  const hasil = hitungPromo(aturan(promo), subtotal, ongkir);
  if (hasil.total <= 0) {
    return {
      ok: false,
      alasan:
        promo.jenis === "ongkir"
          ? "Tidak ada ongkir yang bisa dipotong pada pesanan ini."
          : "Kode ini tidak memberi potongan pada belanja ini.",
    };
  }

  return { ok: true, promo, hasil };
}

/**
 * Naikkan pemakaian, di dalam transaksi pesanan.
 *
 * UPDATE bersyarat, bukan baca-lalu-tulis: dua pembeli yang menebus kode
 * terakhir pada detik yang sama harus membuat salah satunya gagal, dan itu
 * hanya terjamin kalau pemeriksaan kuotanya menyatu dengan penulisannya.
 *
 * Mengembalikan false bila kuotanya baru saja habis.
 */
export async function tebusPromo(tx: Tx, promoId: number): Promise<boolean> {
  const { affectedRows } = await tx.execute(
    `UPDATE promo_codes SET terpakai = terpakai + 1
      WHERE id = ? AND is_active = 1
        AND (kuota IS NULL OR terpakai < kuota)
        AND (mulai IS NULL OR mulai <= NOW())
        AND (berakhir IS NULL OR berakhir >= NOW())`,
    [promoId],
  );
  return affectedRows === 1;
}

/* ── Pengelolaan dari panel ──────────────────────────────────────────── */

export type InputPromo = {
  code: string;
  description: string;
  jenis: JenisPromo;
  nilai: number;
  minBelanja: number;
  maksPotongan: number;
  kuota: number | null;
  kuotaPerOrang: number | null;
  mulai: string | null;
  berakhir: string | null;
  isActive: boolean;
};

export function jenisSah(v: unknown): v is JenisPromo {
  return typeof v === "string" && (JENIS_PROMO as readonly string[]).includes(v);
}

export async function simpanPromoKode(id: number | null, input: InputPromo): Promise<number> {
  const nilai: SqlParam[] = [
    input.code,
    input.description || null,
    input.jenis,
    input.nilai,
    input.minBelanja,
    input.maksPotongan,
    input.kuota,
    input.kuotaPerOrang,
    input.mulai,
    input.berakhir,
    input.isActive ? 1 : 0,
  ];

  if (id) {
    // `terpakai` sengaja TIDAK ikut ditulis: menyunting kode tidak boleh
    // mengulang hitungan pemakaiannya dari nol.
    await execute(
      `UPDATE promo_codes SET code = ?, description = ?, jenis = ?, nilai = ?,
              min_belanja = ?, maks_potongan = ?, kuota = ?, kuota_per_orang = ?,
              mulai = ?, berakhir = ?, is_active = ?
        WHERE id = ?`,
      [...nilai, id],
    );
    return id;
  }

  const { insertId } = await execute(
    `INSERT INTO promo_codes
       (code, description, jenis, nilai, min_belanja, maks_potongan, kuota,
        kuota_per_orang, mulai, berakhir, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nilai,
  );
  return insertId;
}

/**
 * Hapus kode promo.
 *
 * Benar-benar dihapus hanya bila belum pernah ditebus. Kalau sudah, kodenya
 * dinonaktifkan: pesanan lama menyimpan salinan kodenya untuk pelaporan, dan
 * menghapus barisnya membuat riwayat promonya tidak bisa ditelusuri lagi.
 */
export async function hapusPromoKode(id: number): Promise<"dihapus" | "dinonaktifkan"> {
  const p = await getPromo(id);
  if (!p) return "dihapus";

  const b = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM orders WHERE promo_code = ?`, [
    p.code,
  ]);
  if (Number(b?.n ?? 0) > 0 || p.terpakai > 0) {
    await execute(`UPDATE promo_codes SET is_active = 0 WHERE id = ?`, [id]);
    return "dinonaktifkan";
  }

  await execute(`DELETE FROM promo_codes WHERE id = ?`, [id]);
  return "dihapus";
}

/** Berapa kali tiap kode benar-benar dipakai pesanan, untuk laporan. */
export async function statistikPromo(): Promise<
  Record<string, { pesanan: number; potongan: number }>
> {
  const baris = await query<{ promo_code: string; pesanan: number; potongan: number }>(
    `SELECT promo_code, COUNT(*) AS pesanan, COALESCE(SUM(discount), 0) AS potongan
       FROM orders WHERE promo_code IS NOT NULL
        AND status NOT IN ('dibatalkan','kedaluwarsa')
      GROUP BY promo_code`,
  );
  return Object.fromEntries(
    baris.map((b) => [b.promo_code, { pesanan: Number(b.pesanan), potongan: Number(b.potongan) }]),
  );
}
