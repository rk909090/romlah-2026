"use client";

import { useEffect } from "react";
import { useSyncExternalStore } from "react";

/**
 * Konteks untuk tombol WhatsApp yang menempel di layar.
 *
 * Tombol mengambang (kanan bawah) dan tab WhatsApp di bilah bawah hidup di
 * layout, jadi keduanya tidak tahu halaman apa yang sedang dibuka. Padahal
 * pertanyaan dari halaman produk seharusnya sudah menyebut produknya, persis
 * seperti tombol "Tanya lewat WhatsApp" di halaman itu.
 *
 * Dipakai simpanan luar sederhana, bukan React context: penyedianya harus ada
 * di ATAS layout supaya tombolnya bisa membaca, sedangkan yang tahu isinya
 * justru halaman di BAWAH layout. Simpanan modul memotong arah itu tanpa
 * memindahkan apa pun.
 *
 * Polanya sama dengan keranjang di cart-provider.tsx.
 */

export type WaKonteks = {
  pesan: string;
  sumber: "beranda" | "produk" | "toko" | "pesanan" | "footer" | "lain";
  produkSlug?: string;
};

const UMUM: WaKonteks = {
  pesan: "Halo Romlah, saya mau tanya-tanya soal oleh-oleh.",
  sumber: "lain",
};

let konteks: WaKonteks = UMUM;
const pendengar = new Set<() => void>();

function pasang(k: WaKonteks | null) {
  konteks = k ?? UMUM;
  for (const p of pendengar) p();
}

function subscribe(cb: () => void): () => void {
  pendengar.add(cb);
  return () => {
    pendengar.delete(cb);
  };
}

const getSnapshot = () => konteks;
// Di server selalu konteks umum: halaman produk baru memasangnya setelah
// komponennya terpasang di peramban, dan HTML yang berbeda antara server dan
// klien akan memicu galat hidrasi.
const getServerSnapshot = () => UMUM;

export function useWaKonteks(): WaKonteks {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Pasang konteks selama halaman ini terbuka.
 *
 * Dirender oleh halaman yang punya pesan khusus — halaman produk, misalnya.
 * Membersihkan diri saat dilepas, jadi berpindah ke halaman lain otomatis
 * mengembalikan pesan umum tanpa halaman itu perlu tahu apa-apa.
 */
export function SetWaKonteks({ pesan, sumber, produkSlug }: WaKonteks) {
  useEffect(() => {
    pasang({ pesan, sumber, produkSlug });
    return () => pasang(null);
  }, [pesan, sumber, produkSlug]);

  return null;
}
