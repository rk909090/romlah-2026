import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SetupForm } from "@/components/admin/auth-forms";
import { adaAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Penyiapan awal" };

/**
 * Dirender saat permintaan.
 *
 * Halaman ini menanyakan basis data untuk tahu apakah admin sudah ada.
 * Kalau dibiarkan statis, pemeriksaan itu ikut dibekukan saat build — dan
 * build di Hostinger yang belum memegang kredensial basis data akan gagal
 * tepat di sini.
 */
export const dynamic = "force-dynamic";

export default async function Setup() {
  // Hanya berlaku sekali. Begitu ada admin, halaman ini menutup diri —
  // dan server action-nya menolak juga, jadi tidak bisa ditembus lewat
  // permintaan langsung.
  if (await adaAdmin()) redirect("/admin/login");

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
          <div className="tumpal" aria-hidden />
          <div className="p-7 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Image src="/merek/romlah-logo.png" alt="" width={116} height={110} className="h-11 w-auto" />
              <div>
                <h1 className="font-display text-xl leading-tight font-extrabold">Penyiapan awal</h1>
                <p className="text-sm text-muted">Buat akun admin pertama</p>
              </div>
            </div>

            <p className="mb-6 rounded-xl border border-line bg-sunken px-4 py-3 text-sm leading-relaxed text-ink-2">
              Belum ada akun admin di basis data. Akun yang Anda buat di sini menjadi pemilik panel.
              Kata sandinya tidak pernah tersimpan dalam bentuk aslinya — hanya turunan scrypt-nya.
            </p>

            <SetupForm />
          </div>
        </div>
      </div>
    </div>
  );
}
