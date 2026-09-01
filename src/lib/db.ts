import mysql from "mysql2/promise";

/**
 * Kolam koneksi MariaDB.
 *
 * Hostinger membatasi akun ini pada 500 koneksi per jam dan 100 koneksi
 * bersamaan, jadi membuka koneksi baru per permintaan bukan pilihan.
 * Satu kolam kecil dipakai bersama seluruh proses.
 *
 * Kolam disimpan di globalThis karena hot reload Next.js pada mode
 * pengembangan memuat ulang modul ini berkali-kali; tanpa itu, setiap
 * penyimpanan berkas akan menyisakan kolam yatim dan menghabiskan kuota.
 */
function buatPool() {
  const wajib = ["DATABASE_HOST", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD"] as const;
  const kurang = wajib.filter((k) => !process.env[k]);
  if (kurang.length) {
    throw new Error(
      `Variabel lingkungan basis data belum diisi: ${kurang.join(", ")}. ` +
        `Setel di .env.local untuk pengembangan, atau di panel Hostinger untuk produksi.`,
    );
  }

  return mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    waitForConnections: true,
    // Sengaja kecil: kuota Hostinger 100 koneksi bersamaan dipakai bersama
    // seluruh aplikasi di akun ini, bukan hanya situs ini.
    connectionLimit: 5,
    maxIdle: 2,
    idleTimeout: 60_000,
    connectTimeout: 15_000,
    enableKeepAlive: true,
    charset: "utf8mb4_unicode_ci",
    timezone: "Z",
    // Kolom DECIMAL/BIGINT sebagai string akan merepotkan; kita tidak
    // memakai keduanya, jadi angka boleh tetap number.
    supportBigNumbers: true,
  });
}

const g = globalThis as typeof globalThis & { __romlahPool?: mysql.Pool };
export const pool: mysql.Pool = g.__romlahPool ?? buatPool();
if (process.env.NODE_ENV !== "production") g.__romlahPool = pool;

/**
 * Nilai yang boleh jadi parameter terikat.
 *
 * Sengaja tidak memakai `unknown[]`: mysql2 menolaknya, dan mempersempit
 * tipenya di sini membuat kesalahan ketahuan saat kompilasi, bukan saat
 * kueri sudah terlanjur berjalan. `undefined` tidak termasuk — nilai yang
 * belum ada harus ditulis eksplisit sebagai `null`.
 */
export type SqlParam = string | number | bigint | boolean | Date | Buffer | null;

/** Kueri baca dengan parameter terikat. Selalu pakai `?`, jangan rangkai string. */
export async function query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

/** Ambil satu baris, atau undefined bila tidak ada. */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/** Perintah tulis. Mengembalikan insertId dan jumlah baris terpengaruh. */
export async function execute(
  sql: string,
  params: SqlParam[] = [],
): Promise<{ insertId: number; affectedRows: number }> {
  const [hasil] = await pool.execute(sql, params);
  const r = hasil as mysql.ResultSetHeader;
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}

/** Kueri dan perintah di dalam satu transaksi. */
export type Tx = {
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  execute(sql: string, params?: SqlParam[]): Promise<{ insertId: number; affectedRows: number }>;
};

/**
 * Jalankan beberapa perintah sebagai satu transaksi.
 *
 * Dipakai saat menyimpan pesanan: pelanggan, pesanan, dan baris pesanan harus
 * masuk semua atau tidak sama sekali. Pesanan tanpa barang, atau barang tanpa
 * pesanan, lebih buruk daripada pesanan yang gagal tersimpan.
 *
 * Koneksi selalu dikembalikan ke kolam, termasuk saat melempar — kuota
 * Hostinger hanya 100 koneksi bersamaan.
 */
export async function transaksi<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const tx: Tx = {
      async query(sql, params = []) {
        const [rows] = await conn.execute(sql, params);
        return rows as never;
      },
      async execute(sql, params = []) {
        const [hasil] = await conn.execute(sql, params);
        const r = hasil as mysql.ResultSetHeader;
        return { insertId: r.insertId, affectedRows: r.affectedRows };
      },
    };
    const hasil = await fn(tx);
    await conn.commit();
    return hasil;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
