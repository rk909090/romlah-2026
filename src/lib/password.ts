import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Pengurai kata sandi.
 *
 * Sengaja dipisah dari auth.ts yang mengimpor next/headers: modul ini murni
 * Node, sehingga bisa dijalankan dan diuji di luar Next.
 *
 * Memakai scrypt bawaan Node, bukan bcrypt, karena bcrypt butuh binding
 * native dan skrip pascapasang dependensi sudah terbukti menggagalkan build
 * di Hostinger.
 */

// promisify memilih overload tanpa opsi, sehingga parameter N/r/p hilang.
// Tipe eksplisit mengembalikannya tanpa mematikan pemeriksaan tipe.
const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const N = 16384; // butuh 128 * N * r = 16 MB, di bawah batas maxmem bawaan Node
const R = 8;
const P = 1;
const PANJANG_KUNCI = 64;

/** Format: scrypt$N$r$p$salt$hash — parameternya ikut disimpan agar bisa dinaikkan kelak. */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const kunci = await scrypt(plain.normalize("NFKC"), salt, PANJANG_KUNCI, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("hex"), kunci.toString("hex")].join("$");
}

export async function verifyPassword(plain: string, tersimpan: string): Promise<boolean> {
  const bagian = tersimpan.split("$");
  if (bagian.length !== 6 || bagian[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltHex, hashHex] = bagian;
  const salt = Buffer.from(saltHex, "hex");
  const diharapkan = Buffer.from(hashHex, "hex");
  if (salt.length === 0 || diharapkan.length === 0) return false;

  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  let kunci: Buffer;
  try {
    // keylen diambil dari nilai tersimpan, jadi panjang keduanya pasti sama
    // dan timingSafeEqual tidak akan melempar.
    kunci = await scrypt(plain.normalize("NFKC"), salt, diharapkan.length, { N: n, r, p });
  } catch {
    return false;
  }
  return timingSafeEqual(kunci, diharapkan);
}
