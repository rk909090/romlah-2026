import { getCurrentUser } from "@/lib/auth";
import { query, type SqlParam } from "@/lib/db";
import { bacaRentang, syaratRentang } from "@/lib/admin/rentang";

/**
 * Ekspor CSV untuk keperluan pemasaran.
 *
 * Dijaga sesi admin, sama seperti halaman panel. Tanpa itu seluruh daftar
 * nomor WhatsApp pelanggan bisa diunduh siapa saja yang menebak alamatnya.
 */

/**
 * Bungkus satu sel CSV.
 *
 * Tanda kutip digandakan sesuai RFC 4180. Sel yang diawali =, +, -, atau @
 * diberi kutip tunggal di depan: tanpa itu Excel memperlakukannya sebagai
 * rumus, dan nomor telepon seperti "+62812…" bisa berubah jadi hitungan —
 * atau lebih buruk, jadi jalan masuk penyuntikan rumus dari isian pengunjung.
 */
function sel(nilai: unknown): string {
  if (nilai === null || nilai === undefined) return '""';
  let s = nilai instanceof Date ? nilai.toISOString() : String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function keCsv(judul: string[], baris: unknown[][]): string {
  // BOM UTF-8 supaya Excel di Windows membaca "—" dan huruf beraksen dengan
  // benar, bukan sebagai karakter kacau. Ditulis sebagai \uFEFF, bukan
  // karakternya langsung: BOM tidak terlihat di editor dan gampang hilang tanpa
  // ada yang sadar kalau berkasnya kelak disunting.
  return (
    "\uFEFF" +
    [judul, ...baris].map((r) => r.map(sel).join(",")).join("\r\n") +
    "\r\n"
  );
}

/** Waktu WIB dalam bentuk yang terbaca, karena kolomnya tersimpan UTC. */
const waktuWib = (v: unknown) =>
  v
    ? new Date(v as string).toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" })
    : "";

export async function GET(request: Request) {
  if (!(await getCurrentUser())) {
    return new Response("Perlu masuk sebagai admin.", { status: 401 });
  }

  const sp = new URL(request.url).searchParams;
  const jenis = sp.get("jenis") ?? "";
  const r = bacaRentang({
    rentang: sp.get("rentang") ?? undefined,
    dari: sp.get("dari") ?? undefined,
    sampai: sp.get("sampai") ?? undefined,
  });

  let nama: string;
  let csv: string;

  if (jenis === "prospek") {
    const w = syaratRentang(r, "l.created_at");
    const baris = await query<Record<string, unknown>>(
      `SELECT l.created_at, l.name, l.phone, l.email, l.source, l.product_slug,
              l.status, l.message, l.admin_note
         FROM wa_leads l${w.sql ? ` WHERE ${w.sql}` : ""}
        ORDER BY l.created_at DESC`,
      w.nilai as SqlParam[],
    );
    nama = "prospek-wa";
    csv = keCsv(
      ["Waktu (WIB)", "Nama", "WhatsApp", "Email", "Sumber", "Produk", "Status", "Pertanyaan", "Catatan admin"],
      baris.map((b) => [
        waktuWib(b.created_at), b.name, b.phone, b.email, b.source,
        b.product_slug, b.status, b.message, b.admin_note,
      ]),
    );
  } else if (jenis === "pelanggan") {
    // Rentang disaring pada tanggal pesanan terakhir: yang dicari untuk
    // pemasaran adalah "siapa yang belanja pada periode itu".
    const w = syaratRentang(r, "c.last_order_at");
    const baris = await query<Record<string, unknown>>(
      `SELECT c.name, c.phone, c.email, c.created_at, c.last_order_at,
              (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS pesanan,
              COALESCE((SELECT SUM(o.total) FROM orders o
                         WHERE o.customer_id = c.id AND o.status NOT IN
                           ('dibatalkan','kedaluwarsa','dikembalikan')), 0) AS belanja
         FROM customers c${w.sql ? ` WHERE ${w.sql}` : ""}
        ORDER BY c.last_order_at IS NULL, c.last_order_at DESC, c.name`,
      w.nilai as SqlParam[],
    );
    nama = "pelanggan";
    csv = keCsv(
      ["Nama", "WhatsApp", "Email", "Terdaftar (WIB)", "Pesanan terakhir (WIB)", "Jumlah pesanan", "Total belanja"],
      baris.map((b) => [
        b.name, b.phone, b.email, waktuWib(b.created_at), waktuWib(b.last_order_at),
        b.pesanan, b.belanja,
      ]),
    );
  } else if (jenis === "pesanan") {
    const w = syaratRentang(r, "o.created_at");
    const baris = await query<Record<string, unknown>>(
      `SELECT o.created_at, o.order_number, o.channel, o.status, o.customer_name,
              o.customer_phone, o.customer_email, o.courier, o.courier_service,
              o.subtotal, o.shipping_cost, o.total, o.weight_gram,
              o.destination_label, o.address
         FROM orders o${w.sql ? ` WHERE ${w.sql}` : ""}
        ORDER BY o.created_at DESC`,
      w.nilai as SqlParam[],
    );
    nama = "pesanan";
    csv = keCsv(
      ["Waktu (WIB)", "Nomor", "Kanal", "Status", "Nama", "WhatsApp", "Email",
       "Kurir", "Layanan", "Subtotal", "Ongkir", "Total", "Berat (g)", "Wilayah", "Alamat"],
      baris.map((b) => [
        waktuWib(b.created_at), b.order_number, b.channel, b.status, b.customer_name,
        b.customer_phone, b.customer_email, b.courier, b.courier_service,
        b.subtotal, b.shipping_cost, b.total, b.weight_gram, b.destination_label, b.address,
      ]),
    );
  } else {
    return new Response("Jenis ekspor tidak dikenal.", { status: 400 });
  }

  const stempel = r.aktif ? `-${r.dari ?? "awal"}_${r.sampai ?? "kini"}` : "";
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="romlah-${nama}${stempel}.csv"`,
      // Isinya data pelanggan; jangan sampai tersimpan di cache mana pun.
      "Cache-Control": "no-store",
    },
  });
}
