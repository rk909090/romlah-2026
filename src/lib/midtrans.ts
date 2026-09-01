import { createHash } from "node:crypto";

/**
 * Klien Midtrans Snap.
 *
 * Ditulis langsung di atas HTTP, bukan lewat pustaka midtrans-client, agar
 * tidak menambah dependensi. Yang dipakai hanya dua endpoint dan satu
 * verifikasi tanda tangan.
 *
 * Server key TIDAK BOLEH sampai ke peramban. Seluruh berkas ini hanya
 * dipanggil dari server action dan route handler.
 */

const PRODUKSI = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_BASE = PRODUKSI ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
const API_BASE = PRODUKSI ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";

const serverKey = () => process.env.MIDTRANS_SERVER_KEY?.trim() || "";

export const midtransAktif = () => serverKey().length > 0;
export const midtransProduksi = () => PRODUKSI;

export class MidtransError extends Error {}

function basic(): string {
  return "Basic " + Buffer.from(serverKey() + ":").toString("base64");
}

export type ItemSnap = { id: string; name: string; price: number; quantity: number };

export type PermintaanSnap = {
  orderId: string;
  grossAmount: number;
  items: ItemSnap[];
  nama: string;
  telepon: string;
  email?: string | null;
};

/**
 * Buat transaksi Snap, kembalikan tautan halaman pembayaran.
 *
 * Memakai redirect_url, bukan snap.js di peramban: satu berkas skrip lebih
 * sedikit, dan client key tidak perlu ikut dikirim ke halaman.
 */
export async function buatTransaksiSnap(p: PermintaanSnap): Promise<{ token: string; redirectUrl: string }> {
  if (!midtransAktif()) throw new MidtransError("Pembayaran online belum dikonfigurasi.");

  // Midtrans menolak transaksi bila jumlah item_details tidak sama persis
  // dengan gross_amount. Diperiksa di sini supaya galatnya jelas.
  const jumlahItem = p.items.reduce((n, i) => n + i.price * i.quantity, 0);
  if (jumlahItem !== p.grossAmount) {
    throw new MidtransError(
      `Rincian item (${jumlahItem}) tidak sama dengan total (${p.grossAmount}).`,
    );
  }

  const body = {
    transaction_details: { order_id: p.orderId, gross_amount: p.grossAmount },
    item_details: p.items,
    customer_details: {
      first_name: p.nama.slice(0, 50),
      phone: p.telepon,
      ...(p.email ? { email: p.email } : {}),
    },
    // Bawaan QRIS hanya 5 menit — terlalu pendek untuk pembeli yang harus
    // berpindah aplikasi dulu. Satu hari jauh lebih masuk akal.
    expiry: { unit: "hours" as const, duration: 24 },
  };

  let r: Response;
  try {
    r = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
      method: "POST",
      headers: {
        Authorization: basic(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    throw new MidtransError(
      `Tidak bisa menghubungi Midtrans. ${e instanceof Error ? e.message : ""}`.trim(),
    );
  }

  const teks = await r.text();
  let j: { token?: string; redirect_url?: string; error_messages?: string[] };
  try {
    j = JSON.parse(teks) as typeof j;
  } catch {
    throw new MidtransError(`Jawaban Midtrans tidak terbaca (HTTP ${r.status}).`);
  }

  if (!r.ok || !j.token || !j.redirect_url) {
    throw new MidtransError(j.error_messages?.join(" ") ?? `Midtrans menolak permintaan (HTTP ${r.status}).`);
  }
  return { token: j.token, redirectUrl: j.redirect_url };
}

/* ── Notifikasi ──────────────────────────────────────────────────────── */

export type NotifikasiMidtrans = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
};

/**
 * Verifikasi tanda tangan notifikasi.
 *
 * SHA512(order_id + status_code + gross_amount + serverKey).
 *
 * Ini satu-satunya yang membuktikan notifikasi benar dari Midtrans. Tanpa
 * pemeriksaan ini, siapa pun yang tahu alamat webhook bisa menandai pesanan
 * apa pun sebagai lunas.
 */
export function tandaTanganSah(n: NotifikasiMidtrans): boolean {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) return false;
  const dihitung = createHash("sha512")
    .update(n.order_id + n.status_code + n.gross_amount + serverKey())
    .digest("hex");
  // Perbandingan biasa cukup: nilai yang dibandingkan bukan rahasia, dan
  // penyerang sudah memegang keduanya kecuali server key.
  return dihitung === n.signature_key.toLowerCase();
}

/** Status pesanan kita yang sepadan dengan transaction_status Midtrans. */
export function petakanStatus(n: NotifikasiMidtrans): string | null {
  const t = n.transaction_status;
  switch (t) {
    case "capture":
      // Kartu kredit: baru benar-benar lunas kalau lolos saringan penipuan.
      return n.fraud_status === "accept" ? "dibayar" : "menunggu_bayar";
    case "settlement":
      return "dibayar";
    case "pending":
      return "menunggu_bayar";
    case "deny":
    case "cancel":
      return "dibatalkan";
    case "expire":
      return "kedaluwarsa";
    case "refund":
    case "partial_refund":
      return "dikembalikan";
    default:
      return null;
  }
}

/** Tanyakan status transaksi langsung ke Midtrans, untuk pemeriksaan ulang. */
export async function statusTransaksi(orderId: string): Promise<NotifikasiMidtrans> {
  if (!midtransAktif()) throw new MidtransError("Pembayaran online belum dikonfigurasi.");
  const r = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Authorization: basic(), Accept: "application/json" },
    cache: "no-store",
  });
  return (await r.json()) as NotifikasiMidtrans;
}
