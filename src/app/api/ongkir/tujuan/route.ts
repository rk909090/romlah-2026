import { NextResponse } from "next/server";
import { cariTujuan, ShippingError } from "@/lib/shipping";

/**
 * Pencarian tujuan pengiriman.
 *
 * Dibuat sebagai route handler, bukan dipanggil langsung dari komponen klien,
 * karena permintaan ke RajaOngkir membawa header `key` yang tidak boleh
 * sampai ke peramban.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 3) return NextResponse.json({ data: [] });

  try {
    return NextResponse.json({ data: await cariTujuan(q) });
  } catch (e) {
    console.error("[ongkir/tujuan]", e);
    const pesan =
      e instanceof ShippingError ? e.message : "Pencarian alamat sedang bermasalah. Coba lagi sebentar lagi.";
    return NextResponse.json({ data: [], error: pesan }, { status: 502 });
  }
}
