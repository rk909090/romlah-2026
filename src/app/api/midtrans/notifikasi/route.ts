import { NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { midtransAktif, petakanStatus, tandaTanganSah, type NotifikasiMidtrans } from "@/lib/midtrans";

/**
 * Webhook notifikasi pembayaran Midtrans.
 *
 * Alamat ini yang harus didaftarkan di dasbor Midtrans:
 *   https://<domain>/api/midtrans/notifikasi
 *
 * Status pesanan HANYA berubah dari sini, tidak pernah dari halaman sukses
 * yang dibuka peramban — halaman itu bisa dipalsukan siapa saja.
 */
export async function POST(request: Request) {
  if (!midtransAktif()) {
    return NextResponse.json({ error: "Midtrans belum dikonfigurasi." }, { status: 503 });
  }

  let n: NotifikasiMidtrans;
  try {
    n = (await request.json()) as NotifikasiMidtrans;
  } catch {
    return NextResponse.json({ error: "Isi notifikasi tidak terbaca." }, { status: 400 });
  }

  // Tanpa pemeriksaan ini, siapa pun yang tahu alamat webhook bisa menandai
  // pesanan mana pun sebagai lunas.
  if (!tandaTanganSah(n)) {
    console.warn("[midtrans] tanda tangan tidak sah", n.order_id);
    return NextResponse.json({ error: "Tanda tangan tidak sah." }, { status: 403 });
  }

  const status = petakanStatus(n);
  if (!status) {
    // Status yang tidak kita petakan bukan galat; cukup diabaikan supaya
    // Midtrans tidak mengulang pengiriman terus-menerus.
    return NextResponse.json({ ok: true, diabaikan: n.transaction_status });
  }

  const pesanan = await queryOne<{ id: number; total: number; status: string }>(
    `SELECT id, total, status FROM orders WHERE order_number = ? LIMIT 1`,
    [n.order_id!],
  );
  if (!pesanan) {
    console.warn("[midtrans] pesanan tidak ditemukan", n.order_id);
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  // Nilai dari Midtrans dicocokkan dengan yang tersimpan. Kalau berbeda,
  // ada yang tidak beres dan pesanan tidak boleh ditandai lunas.
  const dibayar = Math.round(Number(n.gross_amount ?? 0));
  if (status === "dibayar" && dibayar !== Number(pesanan.total)) {
    console.error("[midtrans] jumlah tidak cocok", n.order_id, dibayar, pesanan.total);
    return NextResponse.json({ error: "Jumlah pembayaran tidak cocok." }, { status: 409 });
  }

  // Pesanan yang sudah selesai atau dikirim tidak dimundurkan oleh
  // notifikasi susulan; Midtrans bisa mengirim ulang kapan saja.
  if (["dikirim", "selesai"].includes(pesanan.status) && status === "dibayar") {
    return NextResponse.json({ ok: true, dilewati: pesanan.status });
  }

  await execute(
    `UPDATE orders
        SET status = ?,
            midtrans_order_id = ?,
            paid_at = CASE WHEN ? = 'dibayar' AND paid_at IS NULL THEN NOW() ELSE paid_at END
      WHERE id = ?`,
    [status, n.order_id!, status, pesanan.id],
  );

  console.info("[midtrans]", n.order_id, n.transaction_status, "->", status);
  return NextResponse.json({ ok: true, status });
}
