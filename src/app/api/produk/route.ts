import { NextResponse } from "next/server";
import { getProducts } from "@/lib/catalog";

/**
 * Ringkasan produk untuk keranjang mini.
 *
 * Ada sebagai route handler, bukan data yang dititipkan lewat layout, supaya
 * halaman yang tidak butuh katalog — /toko, misalnya — tidak ikut memaksa
 * kueri basis data di setiap kunjungan. Kolam koneksi Hostinger kecil, dan
 * panel ini hanya terbuka kalau pembeli benar-benar menambah barang.
 *
 * Hanya mengembalikan kolom yang dipakai panel, bukan produk utuh.
 */
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("slugs") ?? "";
  const diminta = param
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (diminta.length === 0) return NextResponse.json({ data: [] });

  try {
    const semua = await getProducts();
    const pilih = new Set(diminta);
    const data = semua
      .filter((p) => pilih.has(p.slug))
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        price: p.price,
        weightGram: p.weightGram,
        inStock: p.inStock,
        image: p.images[0] ?? null,
      }));
    return NextResponse.json({ data });
  } catch (e) {
    console.error("[api/produk]", e);
    return NextResponse.json({ data: [], error: "Katalog sedang tidak bisa dibaca." }, { status: 502 });
  }
}
