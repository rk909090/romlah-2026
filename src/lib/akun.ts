import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { execute, queryOne } from "./db";
import type { Pelanggan } from "./akun-data";

// Diteruskan lagi supaya komponen server cukup mengimpor satu modul.
// SKRIP UJI harus mengimpor dari ./akun-data — berkas ini memakai
// `next/headers`, yang hanya ada di dalam permintaan Next.
export * from "./akun-data";

/**
 * Akun pelanggan.
 *
 * Terpisah sepenuhnya dari sesi admin: cookie berbeda, tabel berbeda, dan
 * tidak ada satu pun jalur yang bisa menaikkan sesi pelanggan jadi sesi
 * admin. Keduanya kebetulan memakai teknik yang sama — token acak yang
 * disimpan sebagai hash — tapi tidak boleh berbagi apa pun selain itu.
 *
 * TIDAK ADA PENDAFTARAN TERPISAH. Pelanggan sudah punya barisnya di
 * `customers` sejak pesanan pertama; yang dilakukan di sini hanya menetapkan
 * kata sandi untuk baris yang sudah ada.
 *
 * Kepemilikan dibuktikan dengan NOMOR PESANAN, bukan tautan lewat email:
 * pengiriman email belum tersedia, sedangkan nomor pesanan sudah ada di
 * tangan pembeli, acak lima karakter dari 31 huruf, dan hanya diketahui
 * pembeli beserta admin. Begitu pengiriman email aktif, jalur ini bisa
 * ditambah tautan atur ulang lewat email tanpa mengubah yang lain.
 */

const NAMA_COOKIE = "romlah_pelanggan";
const UMUR_SESI_HARI = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function buatSesiPelanggan(customerId: number, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const kedaluwarsa = new Date(Date.now() + UMUR_SESI_HARI * 86_400_000);

  await execute(
    `INSERT INTO customer_sessions (token_hash, customer_id, expires_at, user_agent)
     VALUES (?, ?, ?, ?)`,
    [hashToken(token), customerId, kedaluwarsa, userAgent?.slice(0, 255) ?? null],
  );
  await execute(`UPDATE customers SET last_login_at = NOW() WHERE id = ?`, [customerId]);

  const jar = await cookies();
  jar.set(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: kedaluwarsa,
  });
}

/** Pelanggan yang sedang masuk, atau null. Sesi kedaluwarsa dianggap tidak ada. */
export async function getPelangganSaatIni(): Promise<Pelanggan | null> {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (!token) return null;

  const baris = await queryOne<Pelanggan>(
    `SELECT c.id, c.phone, c.name, c.email
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
      WHERE s.token_hash = ? AND s.expires_at > NOW()
      LIMIT 1`,
    [hashToken(token)],
  );
  return baris ?? null;
}

export async function hapusSesiPelanggan(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (token) {
    await execute(`DELETE FROM customer_sessions WHERE token_hash = ?`, [hashToken(token)]);
  }
  jar.delete(NAMA_COOKIE);
}
