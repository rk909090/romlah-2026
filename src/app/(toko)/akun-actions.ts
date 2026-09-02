"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  aturSandiDenganPesanan,
  bersihkanSesiPelangganKedaluwarsa,
  buatSesiPelanggan,
  hapusSesiPelanggan,
  periksaMasuk,
} from "@/lib/akun";
import { normalkanTelepon, teleponSah } from "@/lib/telepon";

export type FormAkun = { error?: string; ok?: string };

/* ── Pembatas percobaan ────────────────────────────────────────────────
   Disimpan di memori proses, sama seperti pembatas masuk admin. Cukup untuk
   satu aplikasi Node yang berjalan terus seperti di Hostinger. Kalau kelak
   dijalankan multi-proses, pembatas ini perlu pindah ke basis data.
   ─────────────────────────────────────────────────────────────────── */
const percobaan = new Map<string, { n: number; sampai: number }>();
const MAKS_GAGAL = 6;
const KUNCI_MS = 15 * 60_000;

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

const SANDI_MIN = 8;

/* ── Masuk ─────────────────────────────────────────────────────────── */
export async function masukPelanggan(_prev: FormAkun, formData: FormData): Promise<FormAkun> {
  const teleponMentah = String(formData.get("telepon") ?? "");
  const sandi = String(formData.get("sandi") ?? "");

  if (!teleponMentah.trim() || !sandi) return { error: "Nomor WhatsApp dan kata sandi wajib diisi." };
  if (!teleponSah(teleponMentah)) return { error: "Nomor WhatsApp itu tidak valid." };

  const kunci = "masuk:" + normalkanTelepon(teleponMentah);
  const sisa = terkunci(kunci);
  if (sisa > 0) return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisa} menit.` };

  const hasil = await periksaMasuk(teleponMentah, sandi);
  if (!hasil.ok) {
    catatGagal(kunci);
    return {
      error:
        hasil.alasan === "belum-punya-sandi"
          ? "Nomor ini belum punya kata sandi. Buat dulu lewat “Belum punya sandi?” di bawah."
          : "Nomor WhatsApp atau kata sandi salah.",
    };
  }

  percobaan.delete(kunci);
  await bersihkanSesiPelangganKedaluwarsa();
  await buatSesiPelanggan(hasil.pelanggan.id, (await headers()).get("user-agent") ?? undefined);
  redirect("/akun");
}

/* ── Tetapkan atau atur ulang kata sandi ───────────────────────────── */
export async function aturSandiPelanggan(_prev: FormAkun, formData: FormData): Promise<FormAkun> {
  const teleponMentah = String(formData.get("telepon") ?? "");
  const nomorPesanan = String(formData.get("nomorPesanan") ?? "");
  const sandi = String(formData.get("sandi") ?? "");
  const ulangi = String(formData.get("sandi2") ?? "");

  if (!teleponMentah.trim() || !nomorPesanan.trim() || !sandi) {
    return { error: "Nomor WhatsApp, nomor pesanan, dan kata sandi wajib diisi." };
  }
  if (!teleponSah(teleponMentah)) return { error: "Nomor WhatsApp itu tidak valid." };
  if (sandi.length < SANDI_MIN) return { error: `Kata sandi minimal ${SANDI_MIN} karakter.` };
  if (sandi !== ulangi) return { error: "Ulangan kata sandi tidak sama." };

  // Jalur ini adalah pemulihan akses, jadi ia dibatasi sama ketatnya dengan
  // masuk — kalau tidak, nomor pesanan bisa ditebak dengan mencoba terus.
  const kunci = "sandi:" + normalkanTelepon(teleponMentah);
  const sisa = terkunci(kunci);
  if (sisa > 0) return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${sisa} menit.` };

  const hasil = await aturSandiDenganPesanan(teleponMentah, nomorPesanan, sandi);
  if (!hasil.ok) {
    catatGagal(kunci);
    return { error: hasil.alasan };
  }

  percobaan.delete(kunci);
  await buatSesiPelanggan(hasil.pelanggan.id, (await headers()).get("user-agent") ?? undefined);
  redirect("/akun");
}

/* ── Keluar ────────────────────────────────────────────────────────── */
export async function keluarPelanggan(): Promise<void> {
  await hapusSesiPelanggan();
  redirect("/akun/masuk");
}
