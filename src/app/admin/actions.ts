"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  adaAdmin,
  bersihkanSesiKedaluwarsa,
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { execute, queryOne } from "@/lib/db";
import {
  archiveProduct,
  createProduct,
  restoreProduct,
  updateProduct,
  type InputProduk,
} from "@/lib/admin/products";

export type FormState = { error?: string; ok?: string };

/* ── Pembatas percobaan masuk ──────────────────────────────────────────
   Disimpan di memori proses. Cukup untuk satu aplikasi Node yang berjalan
   terus seperti di Hostinger, dan tidak menambah tabel. Kalau kelak
   dijalankan multi-proses, pembatas ini perlu pindah ke basis data.
   ─────────────────────────────────────────────────────────────────── */
const percobaan = new Map<string, { n: number; sampai: number }>();
const MAKS_GAGAL = 5;
const KUNCI_MS = 10 * 60_000;

function terkunci(kunci: string): number {
  const c = percobaan.get(kunci);
  if (!c || c.sampai < Date.now()) return 0;
  return c.n >= MAKS_GAGAL ? Math.ceil((c.sampai - Date.now()) / 60_000) : 0;
}

function catatGagal(kunci: string) {
  const c = percobaan.get(kunci);
  if (!c || c.sampai < Date.now()) percobaan.set(kunci, { n: 1, sampai: Date.now() + KUNCI_MS });
  else percobaan.set(kunci, { n: c.n + 1, sampai: c.sampai });
}

/* ── Masuk ─────────────────────────────────────────────────────────── */
export async function masuk(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandi = String(formData.get("password") ?? "");

  if (!email || !sandi) return { error: "Email dan kata sandi wajib diisi." };

  const sisa = terkunci(email);
  if (sisa > 0) {
    return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisa} menit.` };
  }

  const user = await queryOne<{ id: number; password_hash: string }>(
    `SELECT id, password_hash FROM admin_users WHERE email = ? LIMIT 1`,
    [email],
  );

  // Pesan galat sengaja sama untuk email tidak dikenal maupun sandi salah,
  // supaya tidak bisa dipakai menebak email mana yang terdaftar.
  const cocok = user ? await verifyPassword(sandi, user.password_hash) : false;
  if (!user || !cocok) {
    catatGagal(email);
    return { error: "Email atau kata sandi salah." };
  }

  percobaan.delete(email);
  await bersihkanSesiKedaluwarsa();
  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, ua);
  redirect("/admin");
}

/* ── Keluar ────────────────────────────────────────────────────────── */
export async function keluar(): Promise<void> {
  await destroySession();
  redirect("/admin/login");
}

/* ── Admin pertama ─────────────────────────────────────────────────── */
export async function buatAdminPertama(_prev: FormState, formData: FormData): Promise<FormState> {
  // Dijaga di sisi server juga, bukan hanya dengan menyembunyikan halaman:
  // tanpa ini siapa pun bisa membuat admin kedua lewat permintaan langsung.
  if (await adaAdmin()) return { error: "Admin sudah ada. Silakan masuk." };

  const nama = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const sandi = String(formData.get("password") ?? "");
  const ulangi = String(formData.get("password2") ?? "");

  if (!nama || !email || !sandi) return { error: "Semua kolom wajib diisi." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Format email tidak valid." };
  if (sandi.length < 12) return { error: "Kata sandi minimal 12 karakter." };
  if (sandi !== ulangi) return { error: "Ulangan kata sandi tidak sama." };

  const hash = await hashPassword(sandi);
  const { insertId } = await execute(
    `INSERT INTO admin_users (email, name, password_hash) VALUES (?, ?, ?)`,
    [email, nama, hash],
  );

  const ua = (await headers()).get("user-agent") ?? undefined;
  await createSession(insertId, ua);
  redirect("/admin");
}

/* ── Ganti kata sandi ──────────────────────────────────────────────── */
export async function gantiSandi(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesi berakhir. Silakan masuk lagi." };

  const lama = String(formData.get("current") ?? "");
  const baru = String(formData.get("password") ?? "");
  const ulangi = String(formData.get("password2") ?? "");

  if (baru.length < 12) return { error: "Kata sandi baru minimal 12 karakter." };
  if (baru !== ulangi) return { error: "Ulangan kata sandi tidak sama." };

  const baris = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM admin_users WHERE id = ? LIMIT 1`,
    [user.id],
  );
  if (!baris || !(await verifyPassword(lama, baris.password_hash))) {
    return { error: "Kata sandi saat ini salah." };
  }

  await execute(`UPDATE admin_users SET password_hash = ? WHERE id = ?`, [
    await hashPassword(baru),
    user.id,
  ]);
  // Sesi lain diputus supaya penggantian sandi benar-benar mengunci ulang.
  await execute(`DELETE FROM admin_sessions WHERE user_id = ?`, [user.id]);
  await createSession(user.id, (await headers()).get("user-agent") ?? undefined);

  return { ok: "Kata sandi diperbarui. Sesi lain telah diputus." };
}

/* ── Produk ────────────────────────────────────────────────────────── */
function bacaInputProduk(formData: FormData): InputProduk | string {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const price = Number(formData.get("price"));
  const weightGram = Number(formData.get("weightGram"));
  const kategori = String(formData.get("categoryId") ?? "");

  if (!name) return "Nama produk wajib diisi.";
  if (!slug) return "Slug wajib diisi dan harus memuat huruf atau angka.";
  if (!Number.isFinite(price) || price < 0) return "Harga harus berupa angka tidak negatif.";
  if (!Number.isFinite(weightGram) || weightGram <= 0) {
    return "Berat harus lebih dari 0 gram — nilainya dipakai untuk menghitung ongkir.";
  }

  return {
    name,
    slug,
    price: Math.round(price),
    weightGram: Math.round(weightGram),
    categoryId: kategori ? Number(kategori) : null,
    description: String(formData.get("description") ?? "").trim(),
    inStock: formData.get("inStock") === "on",
    isActive: formData.get("isActive") === "on",
  };
}

/** Kode galat MariaDB untuk pelanggaran indeks unik. */
const DUPLIKAT = "ER_DUP_ENTRY";

export async function simpanProduk(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!(await getCurrentUser())) return { error: "Sesi berakhir. Silakan masuk lagi." };

  const input = bacaInputProduk(formData);
  if (typeof input === "string") return { error: input };

  const idMentah = formData.get("id");
  const id = idMentah ? Number(idMentah) : null;

  try {
    if (id) await updateProduct(id, input);
    else await createProduct(input);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === DUPLIKAT) {
      return { error: `Slug "${input.slug}" sudah dipakai produk lain.` };
    }
    throw e;
  }

  revalidatePath("/admin/produk");
  revalidatePath("/katalog");
  revalidatePath(`/produk/${input.slug}`);
  revalidatePath("/");
  redirect("/admin/produk");
}

export async function ubahArsip(formData: FormData): Promise<void> {
  if (!(await getCurrentUser())) redirect("/admin/login");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return;

  if (formData.get("aksi") === "pulihkan") await restoreProduct(id);
  else await archiveProduct(id);

  revalidatePath("/admin/produk");
  revalidatePath("/katalog");
  revalidatePath("/");
}
