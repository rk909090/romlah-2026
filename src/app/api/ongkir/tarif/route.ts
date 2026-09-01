import { NextResponse } from "next/server";
import { AMBIL_DI_TOKO, hitungOngkir, ONGKIR_MASIH_CONTOH, type Destination } from "@/lib/shipping";

/** Hitung ongkir untuk satu tujuan dan satu berat total keranjang. */
export async function POST(request: Request) {
  let body: { tujuan?: Destination; beratGram?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak terbaca." }, { status: 400 });
  }

  const { tujuan, beratGram } = body;
  if (!tujuan?.id || typeof beratGram !== "number" || beratGram <= 0) {
    return NextResponse.json({ error: "Tujuan dan berat wajib diisi." }, { status: 400 });
  }

  const kurir = await hitungOngkir(tujuan, beratGram);
  return NextResponse.json({
    data: [...kurir, AMBIL_DI_TOKO],
    contoh: ONGKIR_MASIH_CONTOH,
  });
}
