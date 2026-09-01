import { randomInt } from "node:crypto";
import { GRATIS_ONGKIR_MIN } from "@/data/site";
import { normalkanTelepon } from "./admin/customers";
import { query, queryOne, transaksi } from "./db";
import { AMBIL_DI_TOKO, hitungOngkir, type Destination } from "./shipping";

export type ItemMasuk = { slug: string; qty: number };

export type PesananMasuk = {
  items: ItemMasuk[];
  nama: string;
  telepon: string;
  /** Opsional. Dipakai untuk struk Midtrans dan pemberitahuan kelak. */
  email?: string;
  alamat: string;
  tujuan: Destination | null;
  kurirKode: string;
  kurirLayanan: string;
  /** "whatsapp" menunggu konfirmasi admin; "web" langsung menunggu pembayaran. */
  channel?: "web" | "whatsapp";
};

export type PesananTersimpan = {
  orderNumber: string;
  orderId: number;
  email: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  weightGram: number;
  items: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  kurir: string;
  layanan: string;
  etd: string;
  destinationLabel: string | null;
};

/**
 * Alfabet tanpa huruf dan angka yang mudah tertukar (0/O, 1/I/L).
 * Nomor pesanan sering dibacakan lewat WhatsApp, jadi salah baca itu nyata.
 */
const ALFABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * Nomor pesanan: RML-YYMMDD-XXXXX.
 *
 * Bagian acaknya bukan sekadar hiasan. Halaman status pesanan bisa dibuka
 * tanpa login supaya pembeli tidak perlu membuat akun; kalau nomornya urut,
 * siapa pun bisa menebak nomor tetangganya dan membaca alamat orang lain.
 * Lima karakter dari 31 huruf memberi ~28 juta kemungkinan per hari.
 */
function nomorAcak(now: Date): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  let acak = "";
  for (let i = 0; i < 5; i++) acak += ALFABET[randomInt(ALFABET.length)];
  return `RML-${yy}${mm}${dd}-${acak}`;
}

type BarisProduk = { id: number; slug: string; name: string; price: number; weight_gram: number };

/** Kode galat MariaDB untuk pelanggaran indeks unik. */
const DUPLIKAT = "ER_DUP_ENTRY";

/**
 * Simpan pesanan dari keranjang.
 *
 * Harga, berat, dan ongkir SELALU dihitung ulang di sini dari basis data dan
 * dari penyedia ongkir. Nilai apa pun yang dikirim browser hanya dipakai
 * sebagai pilihan (produk mana, kurir mana), tidak pernah sebagai angka.
 */
export async function simpanPesanan(masuk: PesananMasuk): Promise<PesananTersimpan> {
  const nama = masuk.nama.trim();
  const teleponBaku = normalkanTelepon(masuk.telepon);
  const email = masuk.email?.trim() || null;

  if (!nama) throw new Error("Nama penerima wajib diisi.");
  if (teleponBaku.length < 10) throw new Error("Nomor WhatsApp tidak valid.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Format email tidak valid.");
  }
  if (masuk.items.length === 0) throw new Error("Keranjang kosong.");

  // Gabungkan baris kembar dan buang jumlah yang tidak masuk akal.
  const diminta = new Map<string, number>();
  for (const it of masuk.items) {
    const qty = Math.floor(Number(it.qty));
    if (!Number.isFinite(qty) || qty <= 0 || qty > 999) continue;
    diminta.set(it.slug, (diminta.get(it.slug) ?? 0) + qty);
  }
  if (diminta.size === 0) throw new Error("Tidak ada barang yang bisa dipesan.");

  const slugs = [...diminta.keys()];
  const produk = await query<BarisProduk>(
    `SELECT id, slug, name, price, weight_gram FROM products
      WHERE is_active = 1 AND in_stock = 1 AND slug IN (${slugs.map(() => "?").join(",")})`,
    slugs,
  );
  if (produk.length === 0) throw new Error("Produk di keranjang sudah tidak tersedia.");

  const baris = produk.map((p) => {
    const qty = diminta.get(p.slug)!;
    return {
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: Number(p.price),
      weightGram: Number(p.weight_gram),
      lineTotal: Number(p.price) * qty,
    };
  });

  const subtotal = baris.reduce((n, b) => n + b.lineTotal, 0);
  const weightGram = baris.reduce((n, b) => n + b.weightGram * b.qty, 0);

  /* ── Ongkir dihitung ulang, bukan diterima dari browser ─────────── */
  let shippingCost = 0;
  let kurirNama = AMBIL_DI_TOKO.name;
  let kurirLayanan = AMBIL_DI_TOKO.service;
  let etd = AMBIL_DI_TOKO.etd;

  if (masuk.kurirKode !== "pickup") {
    if (!masuk.tujuan?.id) throw new Error("Tujuan pengiriman belum dipilih.");
    const tarif = await hitungOngkir(masuk.tujuan, weightGram);
    const dipilih = tarif.find(
      (t) => t.code === masuk.kurirKode && t.service === masuk.kurirLayanan,
    );
    if (!dipilih) throw new Error("Layanan pengiriman itu tidak tersedia untuk berat ini.");

    kurirNama = dipilih.name;
    kurirLayanan = dipilih.service;
    etd = dipilih.etd;
    // Ambang gratis ongkir juga diterapkan di server, bukan hanya di layar.
    shippingCost = subtotal >= GRATIS_ONGKIR_MIN ? 0 : dipilih.cost;
  }

  const total = subtotal + shippingCost;

  /* ── Tulis dalam satu transaksi ─────────────────────────────────── */
  const tersimpan = await transaksi(async (tx) => {
    await tx.execute(
      // Email yang sudah tersimpan tidak dihapus bila pesanan berikutnya
      // dikirim tanpa email.
      `INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name),
         email = COALESCE(VALUES(email), email),
         last_order_at = NOW()`,
      [teleponBaku, nama, email],
    );
    const pelanggan = await tx.query<{ id: number }>(
      `SELECT id FROM customers WHERE phone = ? LIMIT 1`,
      [teleponBaku],
    );
    const customerId = pelanggan[0]?.id ?? null;

    if (customerId && masuk.alamat.trim() && masuk.tujuan) {
      // Alamat yang sama persis tidak digandakan setiap kali memesan.
      const sudahAda = await tx.query<{ id: number }>(
        `SELECT id FROM customer_addresses
          WHERE customer_id = ? AND address = ? AND destination_id <=> ? LIMIT 1`,
        [customerId, masuk.alamat.trim(), masuk.tujuan.id],
      );
      if (sudahAda.length === 0) {
        await tx.execute(
          `INSERT INTO customer_addresses
             (customer_id, recipient_name, phone, address, destination_id, destination_label, is_default)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            customerId,
            nama,
            teleponBaku,
            masuk.alamat.trim(),
            masuk.tujuan.id,
            masuk.tujuan.label,
            0,
          ],
        );
      }
    }

    // Kanal menentukan status awal: pesanan WhatsApp menunggu admin
    // mengonfirmasi, pesanan web langsung menunggu pembayaran.
    const kanal = masuk.channel ?? "whatsapp";
    const statusAwal = kanal === "web" ? "menunggu_bayar" : "menunggu_konfirmasi";

    // Tabrakan nomor sangat kecil kemungkinannya, tapi bukan nol.
    // Ulangi beberapa kali daripada menggagalkan pesanan yang sah.
    let orderNumber = "";
    let orderId = 0;
    for (let percobaan = 0; percobaan < 5; percobaan++) {
      orderNumber = nomorAcak(new Date());
      try {
        const r = await tx.execute(
          `INSERT INTO orders
             (order_number, customer_id, channel, status, customer_name, customer_phone,
              customer_email, address, destination_id, destination_label, courier,
              courier_service, etd, subtotal, shipping_cost, total, weight_gram)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderNumber,
            customerId,
            kanal,
            statusAwal,
            nama,
            teleponBaku,
            email,
            masuk.alamat.trim() || null,
            masuk.tujuan?.id ?? null,
            masuk.tujuan?.label ?? null,
            kurirNama,
            kurirLayanan,
            etd,
            subtotal,
            shippingCost,
            total,
            weightGram,
          ],
        );
        orderId = r.insertId;
        break;
      } catch (e) {
        const kode = e && typeof e === "object" && "code" in e ? e.code : null;
        if (kode !== DUPLIKAT || percobaan === 4) throw e;
      }
    }

    for (const b of baris) {
      await tx.execute(
        `INSERT INTO order_items (order_id, product_id, name, qty, unit_price, weight_gram)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, b.productId, b.name, b.qty, b.unitPrice, b.weightGram],
      );
    }

    return { orderNumber, orderId };
  });

  return {
    orderNumber: tersimpan.orderNumber,
    orderId: tersimpan.orderId,
    email,
    subtotal,
    shippingCost,
    total,
    weightGram,
    items: baris.map((b) => ({ name: b.name, qty: b.qty, unitPrice: b.unitPrice, lineTotal: b.lineTotal })),
    kurir: kurirNama,
    layanan: kurirLayanan,
    etd,
    destinationLabel: masuk.tujuan?.label ?? null,
  };
}

/* ── Pembacaan ──────────────────────────────────────────────────────── */

export type PesananLengkap = {
  id: number;
  order_number: string;
  status: string;
  channel: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  address: string | null;
  destination_label: string | null;
  courier: string | null;
  courier_service: string | null;
  etd: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  weight_gram: number;
  tracking_number: string | null;
  created_at: string;
};

export type BarisPesanan = {
  name: string;
  qty: number;
  unit_price: number;
  weight_gram: number;
};

export async function getPesananByNomor(nomor: string): Promise<PesananLengkap | undefined> {
  return queryOne<PesananLengkap>(`SELECT * FROM orders WHERE order_number = ? LIMIT 1`, [nomor]);
}

export async function getPesananById(id: number): Promise<PesananLengkap | undefined> {
  return queryOne<PesananLengkap>(`SELECT * FROM orders WHERE id = ? LIMIT 1`, [id]);
}

export async function getBarisPesanan(orderId: number): Promise<BarisPesanan[]> {
  return query<BarisPesanan>(
    `SELECT name, qty, unit_price, weight_gram FROM order_items WHERE order_id = ? ORDER BY id`,
    [orderId],
  );
}

// Konstanta status tinggal di modul terpisah yang tidak mengimpor apa pun,
// supaya komponen klien bisa memakainya tanpa ikut menyeret mysql2.
export {
  STATUS_URUT,
  STATUS_BATAL,
  SEMUA_STATUS,
  LABEL_STATUS,
  labelStatus,
  type StatusPesanan,
} from "./order-status";
