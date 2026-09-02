import { execute, query, queryOne, type SqlParam } from "../db";

export type AdminCustomer = {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  note: string | null;
  createdAt: string;
  lastOrderAt: string | null;
  orderCount: number;
  totalSpent: number;
};

/**
 * Samakan bentuk nomor telepon Indonesia.
 *
 * "0812-3456-7890", "+62 812 3456 7890", dan "62812345678 90" harus menunjuk
 * orang yang sama, kalau tidak satu pembeli akan tercatat sebagai beberapa
 * pelanggan berbeda dan riwayatnya pecah.
 *
 * Bentuk baku: hanya angka, berawalan 62.
 */
export function normalkanTelepon(mentah: string): string {
  const n = mentah.replace(/\D/g, "");
  if (n.startsWith("62")) return n;
  if (n.startsWith("0")) return "62" + n.slice(1);
  if (n.startsWith("8")) return "62" + n; // orang sering menulis tanpa nol depan
  return n;
}

/** Tampilkan sebagai +62 812-3456-7890. */
export function tampilkanTelepon(baku: string): string {
  if (!baku.startsWith("62")) return baku;
  const sisa = baku.slice(2);
  const p = sisa.match(/^(\d{3})(\d{3,4})(\d{0,6})$/);
  return p ? `+62 ${p[1]}-${p[2]}${p[3] ? "-" + p[3] : ""}` : `+${baku}`;
}

const PILIH = `
  SELECT c.id, c.phone, c.name, c.email, c.note,
         c.created_at AS createdAt, c.last_order_at AS lastOrderAt,
         (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orderCount,
         COALESCE((SELECT SUM(o.total) FROM orders o
                    WHERE o.customer_id = c.id AND o.status NOT IN
                      ('dibatalkan','kedaluwarsa','dikembalikan')), 0) AS totalSpent
    FROM customers c`;

const petakan = (b: AdminCustomer): AdminCustomer => ({
  ...b,
  orderCount: Number(b.orderCount),
  totalSpent: Number(b.totalSpent),
});

/** WHERE dan nilainya, dipakai bersama oleh daftar dan hitungan. */
function syaratPelanggan(q?: string): { where: string; nilai: SqlParam[] } {
  if (!q?.trim()) return { where: "", nilai: [] };
  const cari = `%${q.trim()}%`;
  // Pencarian juga menerima nomor dalam format apa pun, karena nomor yang
  // diketik dinormalkan lebih dulu.
  return {
    where: " WHERE c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?",
    nilai: [cari, `%${normalkanTelepon(q)}%`, cari],
  };
}

export async function listCustomers(
  q?: string,
  paging?: { per: number; lewati: number },
): Promise<AdminCustomer[]> {
  const { where, nilai } = syaratPelanggan(q);
  // LIMIT/OFFSET sebagai angka yang sudah dibulatkan; MariaDB menolak
  // placeholder di posisi ini pada pernyataan yang disiapkan.
  const batas = paging
    ? ` LIMIT ${Math.max(1, Math.floor(paging.per))} OFFSET ${Math.max(0, Math.floor(paging.lewati))}`
    : "";
  const baris = await query<AdminCustomer>(
    `${PILIH}${where} ORDER BY c.last_order_at IS NULL, c.last_order_at DESC, c.name${batas}`,
    nilai,
  );
  return baris.map(petakan);
}

/** Jumlah pelanggan yang cocok dengan pencarian — pasangan listCustomers. */
export async function countCustomersCocok(q?: string): Promise<number> {
  const { where, nilai } = syaratPelanggan(q);
  const b = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM customers c${where}`, nilai);
  return Number(b?.n ?? 0);
}

export async function getCustomer(id: number): Promise<AdminCustomer | undefined> {
  const b = await queryOne<AdminCustomer>(`${PILIH} WHERE c.id = ? LIMIT 1`, [id]);
  return b ? petakan(b) : undefined;
}

/**
 * Cari pelanggan berdasarkan nomor, buat kalau belum ada.
 *
 * Dipakai saat pesanan masuk. Nama diperbarui bila pembeli menuliskannya
 * berbeda dari sebelumnya — yang terakhir dianggap paling benar.
 */
export async function upsertCustomer(input: {
  phone: string;
  name: string;
  email?: string | null;
}): Promise<number> {
  const phone = normalkanTelepon(input.phone);
  if (!phone) throw new Error("Nomor telepon pelanggan kosong setelah dinormalkan.");

  await execute(
    `INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name),
       email = COALESCE(VALUES(email), email)`,
    [phone, input.name, input.email ?? null],
  );

  const baris = await queryOne<{ id: number }>(`SELECT id FROM customers WHERE phone = ? LIMIT 1`, [
    phone,
  ]);
  if (!baris) throw new Error("Gagal membaca pelanggan setelah disimpan.");
  return baris.id;
}

export async function getCustomerAddresses(customerId: number) {
  return query<{
    id: number;
    label: string | null;
    recipient_name: string;
    phone: string;
    address: string;
    destination_label: string | null;
    is_default: number;
  }>(
    `SELECT id, label, recipient_name, phone, address, destination_label, is_default
       FROM customer_addresses WHERE customer_id = ?
      ORDER BY is_default DESC, id DESC`,
    [customerId],
  );
}

export async function getCustomerOrders(customerId: number) {
  return query<{
    id: number;
    order_number: string;
    status: string;
    channel: string;
    total: number;
    created_at: string;
  }>(
    `SELECT id, order_number, status, channel, total, created_at
       FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`,
    [customerId],
  );
}

export async function countCustomers(): Promise<number> {
  const b = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM customers`);
  return Number(b?.n ?? 0);
}
