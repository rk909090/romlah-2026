import { NextResponse } from "next/server";
import { AMBIL_DI_TOKO, hitungOngkir, pakaiContoh, ShippingError, type Destination } from "@/lib/shipping";

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

  try {
    const kurir = await hitungOngkir(tujuan, beratGram);
    // Ambil di toko selalu ditawarkan, bahkan saat tidak ada kurir yang
    // melayani tujuan itu.
    return NextResponse.json({ data: [...kurir, AMBIL_DI_TOKO], contoh: pakaiContoh() });
  } catch (e) {
    console.error("[ongkir/tarif]", e);
    const pesan =
      e instanceof ShippingError
        ? e.message
        : "Perhitungan ongkir sedang bermasalah. Coba lagi sebentar lagi.";
    // Ambil di toko tetap dikirim supaya pembeli tidak buntu total saat
    // layanan ongkir sedang gagal.
    return NextResponse.json({ data: [AMBIL_DI_TOKO], contoh: false, error: pesan }, { status: 502 });
  }
}
