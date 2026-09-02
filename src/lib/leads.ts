import { normalkanTelepon, upsertCustomer } from "./admin/customers";
import { execute, query, queryOne, type SqlParam } from "./db";
import { STATUS_LEAD, SUMBER, type Lead, type StatusLead, type SumberLead } from "./lead-status";

// Diteruskan lagi supaya pemanggil di sisi server cukup mengimpor satu modul.
// Komponen klien WAJIB mengimpor dari ./lead-status, bukan dari sini.
export { LABEL_STATUS_LEAD, LABEL_SUMBER, STATUS_LEAD, SUMBER } from "./lead-status";
export type { Lead, StatusLead, SumberLead } from "./lead-status";

/**
 * Prospek dari tombol WhatsApp.
 *
 * Setiap tombol WhatsApp di toko meminta data pengunjung lebih dulu, lalu
 * baru membuka percakapan. Tanpa ini, seluruh pertanyaan yang masuk lewat
 * WhatsApp tidak meninggalkan jejak apa pun yang bisa ditindaklanjuti —
 * dan WhatsApp adalah kanal terbesar Romlah.
 *
 * Tombol "Pesan lewat WhatsApp" di keranjang TIDAK lewat sini: yang itu
 * sudah membuat pesanan sungguhan, lengkap dengan barang dan ongkirnya.
 */

export type LeadMasuk = {
  nama: string;
  telepon: string;
  email?: string;
  pesan?: string;
  sumber?: string;
  produkSlug?: string;
  halaman?: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Simpan prospek, kembalikan id-nya.
 *
 * Pelanggan ikut di-upsert supaya prospek dan pembeli lama menyatu di satu
 * baris pelanggan — orang yang tahun lalu memesan dan hari ini bertanya lagi
 * bukan dua orang berbeda.
 */
export async function simpanLead(masuk: LeadMasuk): Promise<number> {
  const nama = masuk.nama.trim();
  const telepon = normalkanTelepon(masuk.telepon);
  const email = masuk.email?.trim() || null;

  if (nama.length < 2) throw new Error("Nama wajib diisi.");
  if (telepon.length < 10) throw new Error("Nomor WhatsApp tidak valid.");
  if (email && !EMAIL.test(email)) throw new Error("Format email tidak valid.");

  // Nomor pelanggan dipakai sebagai kunci gabungan; kalau upsert-nya gagal
  // prospeknya tetap disimpan tanpa tautan, karena kehilangan prospek jauh
  // lebih mahal daripada kehilangan tautannya.
  let customerId: number | null = null;
  try {
    customerId = await upsertCustomer({ phone: telepon, name: nama, email });
  } catch (e) {
    console.error("[simpanLead/upsertCustomer]", e);
  }

  const sumber: SumberLead = SUMBER.includes(masuk.sumber as SumberLead)
    ? (masuk.sumber as SumberLead)
    : "lain";

  const { insertId } = await execute(
    `INSERT INTO wa_leads (customer_id, name, phone, email, message, source, product_slug, page_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      nama.slice(0, 190),
      telepon,
      email,
      masuk.pesan?.trim().slice(0, 2000) || null,
      sumber,
      masuk.produkSlug?.slice(0, 190) || null,
      masuk.halaman?.slice(0, 255) || null,
    ],
  );
  return insertId;
}

/* ── Baca untuk panel admin ──────────────────────────────────────────── */

type BarisLead = {
  id: number;
  customer_id: number | null;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: SumberLead;
  product_slug: string | null;
  page_path: string | null;
  status: StatusLead;
  admin_note: string | null;
  created_at: string;
};

const petakan = (b: BarisLead): Lead => ({
  id: b.id,
  customerId: b.customer_id,
  name: b.name,
  phone: b.phone,
  email: b.email,
  message: b.message,
  source: b.source,
  productSlug: b.product_slug,
  pagePath: b.page_path,
  status: b.status,
  adminNote: b.admin_note,
  createdAt: b.created_at,
});

export async function listLeads(f: { q?: string; status?: string } = {}): Promise<Lead[]> {
  const syarat: string[] = [];
  const nilai: SqlParam[] = [];

  if (f.q?.trim()) {
    const cari = `%${f.q.trim()}%`;
    syarat.push("(name LIKE ? OR phone LIKE ? OR email LIKE ? OR message LIKE ?)");
    nilai.push(cari, `%${normalkanTelepon(f.q)}%`, cari, cari);
  }
  if (f.status && STATUS_LEAD.includes(f.status as StatusLead)) {
    syarat.push("status = ?");
    nilai.push(f.status);
  }

  const where = syarat.length ? ` WHERE ${syarat.join(" AND ")}` : "";
  const baris = await query<BarisLead>(
    `SELECT id, customer_id, name, phone, email, message, source, product_slug,
            page_path, status, admin_note, created_at
       FROM wa_leads${where} ORDER BY created_at DESC LIMIT 500`,
    nilai,
  );
  return baris.map(petakan);
}

export async function getLead(id: number): Promise<Lead | undefined> {
  const b = await queryOne<BarisLead>(
    `SELECT id, customer_id, name, phone, email, message, source, product_slug,
            page_path, status, admin_note, created_at
       FROM wa_leads WHERE id = ? LIMIT 1`,
    [id],
  );
  return b ? petakan(b) : undefined;
}

/** Prospek milik satu pelanggan, untuk halaman detail pelanggan. */
export async function getLeadsPelanggan(customerId: number): Promise<Lead[]> {
  const baris = await query<BarisLead>(
    `SELECT id, customer_id, name, phone, email, message, source, product_slug,
            page_path, status, admin_note, created_at
       FROM wa_leads WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
    [customerId],
  );
  return baris.map(petakan);
}

export async function ubahStatusLead(
  id: number,
  status: StatusLead,
  catatan: string | null,
): Promise<number> {
  const { affectedRows } = await execute(
    `UPDATE wa_leads SET status = ?, admin_note = ? WHERE id = ?`,
    [status, catatan, id],
  );
  return affectedRows;
}

/** Angka ringkas untuk dasbor dan lencana menu. */
export async function hitungLead(): Promise<{ total: number; baru: number; mingguIni: number }> {
  const b = await queryOne<{ total: number; baru: number; mingguIni: number }>(
    `SELECT COUNT(*) AS total,
            SUM(status = 'baru') AS baru,
            SUM(created_at >= NOW() - INTERVAL 7 DAY) AS mingguIni
       FROM wa_leads`,
  );
  return {
    total: Number(b?.total ?? 0),
    baru: Number(b?.baru ?? 0),
    mingguIni: Number(b?.mingguIni ?? 0),
  };
}
