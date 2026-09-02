/**
 * Status prospek WhatsApp — konstanta dan tipe saja, tanpa basis data.
 *
 * Dipisah dari lib/leads.ts dengan alasan yang sama seperti lib/order-status.ts:
 * komponen "use client" perlu daftar status ini, dan mengimpornya dari modul
 * yang menyentuh mysql2 akan menyeret seluruh pustaka basis data ke bundel
 * peramban — yang langsung gagal dibangun karena mysql2 memakai `net` dan `tls`.
 */

export const STATUS_LEAD = ["baru", "dihubungi", "prospek", "jadi_pesanan", "batal"] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

export const LABEL_STATUS_LEAD: Record<StatusLead, string> = {
  baru: "Baru",
  dihubungi: "Sudah dihubungi",
  prospek: "Prospek",
  jadi_pesanan: "Jadi pesanan",
  batal: "Batal",
};

/** Warna lencana per status, memakai token warna yang sama dengan toko. */
export const WARNA_STATUS_LEAD: Record<StatusLead, string> = {
  baru: "bg-jingga-soft text-jingga",
  dihubungi: "bg-warn-soft text-warn",
  prospek: "bg-warn-soft text-warn",
  jadi_pesanan: "bg-pandan-soft text-pandan",
  batal: "bg-line text-muted",
};

export const SUMBER = ["beranda", "produk", "toko", "pesanan", "footer", "lain"] as const;
export type SumberLead = (typeof SUMBER)[number];

export const LABEL_SUMBER: Record<SumberLead, string> = {
  beranda: "Beranda",
  produk: "Halaman produk",
  toko: "Halaman toko",
  pesanan: "Halaman status pesanan",
  footer: "Footer",
  lain: "Lain-lain",
};

export type Lead = {
  id: number;
  customerId: number | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: SumberLead;
  productSlug: string | null;
  pagePath: string | null;
  status: StatusLead;
  adminNote: string | null;
  createdAt: string;
};
