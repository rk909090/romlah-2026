import { execute, query, queryOne } from "./db";
import { hashPassword, verifyPassword } from "./password";
import { normalkanTelepon } from "./telepon";

/**
 * Akun pelanggan — kredensial dan datanya, TANPA menyentuh cookie.
 *
 * Dipisah dari lib/akun.ts yang mengimpor `next/headers`: modul itu hanya
 * bisa dijalankan di dalam permintaan Next, sehingga seluruh keputusan
 * keamanannya jadi tidak bisa diuji dari skrip. Yang di sini bisa.
 *
 * TIDAK ADA PENDAFTARAN TERPISAH. Pelanggan sudah punya barisnya di
 * `customers` sejak pesanan pertama; yang dilakukan di sini hanya menetapkan
 * kata sandi untuk baris yang sudah ada.
 *
 * Kepemilikan dibuktikan dengan NOMOR PESANAN, bukan tautan lewat email:
 * pengiriman email belum tersedia, sedangkan nomor pesanan sudah ada di
 * tangan pembeli, acak lima karakter dari 31 huruf, dan hanya diketahui
 * pembeli beserta admin. Begitu pengiriman email aktif, jalur ini bisa
 * ditambah tautan atur ulang lewat email tanpa mengubah yang lain.
 */

export type Pelanggan = {
  id: number;
  phone: string;
  name: string;
  email: string | null;
};

export async function bersihkanSesiPelangganKedaluwarsa(): Promise<void> {
  await execute(`DELETE FROM customer_sessions WHERE expires_at < NOW()`);
}

/* ── Masuk ───────────────────────────────────────────────────────────── */

export type HasilMasuk =
  | { ok: true; pelanggan: Pelanggan }
  | { ok: false; alasan: "salah" | "belum-punya-sandi" };

/**
 * Periksa nomor dan kata sandi.
 *
 * Membedakan "belum punya sandi" dari "salah" itu disengaja, dan aman:
 * keberadaan sebuah nomor di basis data bukan rahasia yang berguna — siapa
 * pun bisa memesan dengan nomor itu dan mengetahuinya. Yang dijaga adalah
 * KATA SANDINYA, dan untuk itu pesannya tetap sama antara nomor tak dikenal
 * dan sandi keliru.
 */
export async function periksaMasuk(telepon: string, sandi: string): Promise<HasilMasuk> {
  const phone = normalkanTelepon(telepon);
  const baris = await queryOne<{ id: number; phone: string; name: string; email: string | null; password_hash: string | null }>(
    `SELECT id, phone, name, email, password_hash FROM customers WHERE phone = ? LIMIT 1`,
    [phone],
  );

  if (baris && baris.password_hash === null) return { ok: false, alasan: "belum-punya-sandi" };

  const cocok = baris?.password_hash ? await verifyPassword(sandi, baris.password_hash) : false;
  if (!baris || !cocok) return { ok: false, alasan: "salah" };

  return { ok: true, pelanggan: { id: baris.id, phone: baris.phone, name: baris.name, email: baris.email } };
}

/* ── Menetapkan atau mengatur ulang kata sandi ───────────────────────── */

export type HasilAturSandi =
  | { ok: true; pelanggan: Pelanggan }
  | { ok: false; alasan: string };

/**
 * Tetapkan kata sandi dengan bukti kepemilikan berupa nomor pesanan.
 *
 * Nomor pesanannya harus MILIK nomor telepon itu — pemeriksaannya satu kueri
 * yang mensyaratkan keduanya sekaligus, jadi menebak nomor pesanan orang lain
 * tidak menolong siapa pun.
 *
 * Seluruh sesi lama diputus setelah kata sandi diganti. Kalau akunnya memang
 * sedang disalahgunakan, mengganti sandi harus benar-benar mengunci ulang.
 */
export async function aturSandiDenganPesanan(
  telepon: string,
  nomorPesanan: string,
  sandiBaru: string,
): Promise<HasilAturSandi> {
  const phone = normalkanTelepon(telepon);
  const nomor = nomorPesanan.trim().toUpperCase();

  const pesanan = await queryOne<{ customer_id: number | null }>(
    `SELECT customer_id FROM orders
      WHERE order_number = ? AND customer_phone = ? LIMIT 1`,
    [nomor, phone],
  );

  if (!pesanan) {
    return {
      ok: false,
      alasan:
        "Nomor pesanan itu tidak cocok dengan nomor WhatsApp yang diisi. Periksa lagi keduanya, atau hubungi kami lewat WhatsApp.",
    };
  }

  const c = await queryOne<Pelanggan>(
    `SELECT id, phone, name, email FROM customers WHERE phone = ? LIMIT 1`,
    [phone],
  );
  if (!c) {
    // Bisa terjadi pada pesanan lama yang customer_id-nya sempat kosong.
    return { ok: false, alasan: "Data pelanggan untuk nomor itu belum lengkap. Hubungi kami lewat WhatsApp." };
  }

  await execute(`UPDATE customers SET password_hash = ? WHERE id = ?`, [
    await hashPassword(sandiBaru),
    c.id,
  ]);
  await execute(`DELETE FROM customer_sessions WHERE customer_id = ?`, [c.id]);

  return { ok: true, pelanggan: c };
}

/** Apakah nomor ini sudah punya kata sandi. Dipakai untuk memilih kalimat. */
export async function punyaSandi(telepon: string): Promise<boolean> {
  const b = await queryOne<{ ada: number }>(
    `SELECT password_hash IS NOT NULL AS ada FROM customers WHERE phone = ? LIMIT 1`,
    [normalkanTelepon(telepon)],
  );
  return Number(b?.ada ?? 0) === 1;
}

/* ── Data untuk halaman akun ─────────────────────────────────────────── */

export type PesananPelanggan = {
  order_number: string;
  status: string;
  channel: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  promo_code: string | null;
  courier: string | null;
  courier_service: string | null;
  tracking_number: string | null;
  destination_label: string | null;
  created_at: string;
  jumlahBarang: number;
};

export async function getPesananPelanggan(customerId: number): Promise<PesananPelanggan[]> {
  return query<PesananPelanggan>(
    `SELECT o.order_number, o.status, o.channel, o.subtotal, o.shipping_cost,
            o.discount, o.total, o.promo_code, o.courier, o.courier_service,
            o.tracking_number, o.destination_label, o.created_at,
            (SELECT COALESCE(SUM(i.qty), 0) FROM order_items i WHERE i.order_id = o.id) AS jumlahBarang
       FROM orders o
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
      LIMIT 100`,
    [customerId],
  );
}

/** Ringkasan belanja untuk kepala halaman akun. */
export async function getRingkasanPelanggan(customerId: number) {
  const b = await queryOne<{ pesanan: number; belanja: number; terakhir: string | null }>(
    `SELECT COUNT(*) AS pesanan,
            COALESCE(SUM(CASE WHEN status NOT IN ('dibatalkan','kedaluwarsa','dikembalikan')
                              THEN total ELSE 0 END), 0) AS belanja,
            MAX(created_at) AS terakhir
       FROM orders WHERE customer_id = ?`,
    [customerId],
  );
  return {
    pesanan: Number(b?.pesanan ?? 0),
    belanja: Number(b?.belanja ?? 0),
    terakhir: b?.terakhir ?? null,
  };
}
