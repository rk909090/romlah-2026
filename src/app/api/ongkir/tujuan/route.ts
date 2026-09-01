import { NextResponse } from "next/server";
import { cariTujuan } from "@/lib/shipping";

/**
 * Pencarian tujuan pengiriman.
 *
 * Sengaja dibuat sebagai route handler, bukan dipanggil langsung dari komponen
 * klien: begitu RajaOngkir aktif, permintaan harus membawa header `key` yang
 * tidak boleh sampai ke browser. Dengan pola ini, penggantiannya cukup di sini.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";

  if (q.trim().length < 3) {
    return NextResponse.json({ data: [] });
  }

  const data = await cariTujuan(q);
  return NextResponse.json({ data });
}
