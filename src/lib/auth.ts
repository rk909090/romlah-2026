import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { execute, queryOne } from "./db";

// Diekspor ulang supaya pemanggil cukup tahu satu modul auth.
export { hashPassword, verifyPassword } from "./password";

/* ── Sesi ─────────────────────────────────────────────────────────────
   Token acak dikirim sebagai cookie httpOnly; yang disimpan di basis
   data hanya hash-nya. Isi tabel yang bocor tidak cukup untuk membajak
   sesi siapa pun.
   ─────────────────────────────────────────────────────────────────── */

const NAMA_COOKIE = "romlah_admin";
const UMUR_SESI_HARI = 7;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type AdminUser = {
  id: number;
  email: string;
  name: string;
};

export async function createSession(userId: number, userAgent?: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const kedaluwarsa = new Date(Date.now() + UMUR_SESI_HARI * 86_400_000);

  await execute(
    `INSERT INTO admin_sessions (token_hash, user_id, expires_at, user_agent) VALUES (?, ?, ?, ?)`,
    [hashToken(token), userId, kedaluwarsa, userAgent?.slice(0, 255) ?? null],
  );
  await execute(`UPDATE admin_users SET last_login_at = NOW() WHERE id = ?`, [userId]);

  const jar = await cookies();
  jar.set(NAMA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: kedaluwarsa,
  });
}

/** Pengguna yang sedang masuk, atau null. Sesi kedaluwarsa dianggap tidak ada. */
export async function getCurrentUser(): Promise<AdminUser | null> {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (!token) return null;

  const baris = await queryOne<AdminUser>(
    `SELECT u.id, u.email, u.name
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW()
      LIMIT 1`,
    [hashToken(token)],
  );
  return baris ?? null;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(NAMA_COOKIE)?.value;
  if (token) {
    await execute(`DELETE FROM admin_sessions WHERE token_hash = ?`, [hashToken(token)]);
  }
  jar.delete(NAMA_COOKIE);
}

/** Buang sesi yang sudah lewat masa berlakunya. Dipanggil saat login. */
export async function bersihkanSesiKedaluwarsa(): Promise<void> {
  await execute(`DELETE FROM admin_sessions WHERE expires_at < NOW()`);
}

export async function adaAdmin(): Promise<boolean> {
  const baris = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM admin_users`);
  return (baris?.n ?? 0) > 0;
}
