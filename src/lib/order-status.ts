/**
 * Status pesanan dan labelnya.
 *
 * Sengaja berdiri sendiri tanpa mengimpor apa pun.
 *
 * Sebelumnya konstanta ini tinggal di orders.ts, dan komponen klien yang
 * mengimpornya ikut menyeret seluruh rantai impor sampai ke mysql2 — bundler
 * lalu gagal mencari modul `net` dan `tls` milik Node. Nilai yang dipakai
 * bersama sisi server dan sisi klien harus tinggal di berkas yang bersih
 * seperti ini.
 */

export const STATUS_URUT = [
  "menunggu_konfirmasi",
  "menunggu_bayar",
  "dibayar",
  "diproses",
  "dikirim",
  "selesai",
] as const;

export const STATUS_BATAL = ["dibatalkan", "kedaluwarsa", "dikembalikan"] as const;

export const SEMUA_STATUS = [...STATUS_URUT, ...STATUS_BATAL] as const;

export type StatusPesanan = (typeof SEMUA_STATUS)[number];

/** Status yang dianggap sudah dibayar, dipakai untuk mengisi paid_at. */
export const STATUS_LUNAS: readonly StatusPesanan[] = ["dibayar", "diproses", "dikirim", "selesai"];

export const LABEL_STATUS: Record<StatusPesanan, string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_bayar: "Menunggu pembayaran",
  dibayar: "Sudah dibayar",
  diproses: "Sedang disiapkan",
  dikirim: "Dalam pengiriman",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
  dikembalikan: "Dikembalikan",
};

export function labelStatus(status: string): string {
  return LABEL_STATUS[status as StatusPesanan] ?? status.replace(/_/g, " ");
}
