import { cache } from "react";
import { query, queryOne } from "./db";
import type { Category, CategorySlug, Product } from "./types";

/**
 * Satu-satunya pintu ke data katalog.
 *
 * Sebelumnya membaca berkas JSON hasil migrasi; sekarang membaca MariaDB.
 * Halaman dan komponen di atasnya tidak berubah sama sekali karena seluruh
 * fungsi di sini sejak awal sudah async dan bentuk kembaliannya tetap.
 */

type BarisProduk = {
  id: number;
  legacy_id: number | null;
  slug: string;
  name: string;
  price: number;
  weight_gram: number;
  category: CategorySlug | null;
  description: string | null;
  in_stock: number;
};

type BarisFoto = {
  product_id: number;
  src: string;
  alt: string;
};

/**
 * Produk yang boleh tampil di toko.
 *
 * Dua saringan, bukan satu: produknya sendiri harus aktif, DAN kategorinya
 * harus aktif. Yang kedua dipakai untuk Paket — bundling hanya dijual saat
 * ada program pemasaran, dan mematikan kategorinya harus benar-benar
 * menyembunyikan seluruh isinya, bukan sekadar menghilangkan tautannya.
 *
 * Produk tanpa kategori tetap tampil: tidak punya kategori bukan berarti
 * kategorinya mati.
 */
const PILIH = `
  SELECT p.id, p.legacy_id, p.slug, p.name, p.price, p.weight_gram,
         c.slug AS category, p.description, p.in_stock
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
   WHERE p.is_active = 1
     AND (p.category_id IS NULL OR c.is_active = 1)`;

/**
 * Pasangkan produk dengan fotonya lewat satu kueri tambahan, bukan satu
 * kueri per produk. Kuota koneksi Hostinger terbatas, jadi N+1 bukan
 * sekadar soal kecepatan.
 */
async function lengkapi(baris: BarisProduk[]): Promise<Product[]> {
  if (baris.length === 0) return [];

  const ids = baris.map((b) => b.id);
  const foto = await query<BarisFoto>(
    `SELECT product_id, src, alt FROM product_images
      WHERE product_id IN (${ids.map(() => "?").join(",")})
      ORDER BY product_id, sort_order, id`,
    ids,
  );

  const perProduk = new Map<number, { src: string; alt: string }[]>();
  for (const f of foto) {
    const daftar = perProduk.get(f.product_id) ?? [];
    daftar.push({ src: f.src, alt: f.alt });
    perProduk.set(f.product_id, daftar);
  }

  return baris.map((b) => ({
    legacyId: b.legacy_id ?? b.id,
    slug: b.slug,
    name: b.name,
    price: Number(b.price),
    weightGram: Number(b.weight_gram),
    category: b.category ?? "makanan",
    description: (b.description ?? "").split("\n").filter(Boolean),
    images: perProduk.get(b.id) ?? [],
    inStock: b.in_stock === 1,
    isVariable: false,
  }));
}

/**
 * Kategori yang sedang dinyalakan.
 *
 * Dibungkus `cache()` dari React karena dipanggil dua kali dalam satu
 * permintaan: sekali oleh layout toko (untuk menyusun menu) dan sekali lagi
 * oleh halamannya. Tanpa ini, setiap kunjungan memakai dua koneksi basis
 * data untuk jawaban yang sama persis, padahal kuota Hostinger cuma 100
 * koneksi bersamaan.
 */
export const getCategories = cache(async function getCategories(): Promise<Category[]> {
  const baris = await query<{ slug: CategorySlug; name: string; blurb: string }>(
    `SELECT slug, name, blurb FROM categories WHERE is_active = 1 ORDER BY sort_order, name`,
  );
  return baris.map((b) => ({ slug: b.slug, name: b.name, blurb: b.blurb }));
});

/** Apakah satu kategori sedang dinyalakan. Dipakai menu dan tab bar. */
export async function kategoriAktif(slug: CategorySlug): Promise<boolean> {
  return (await getCategories()).some((c) => c.slug === slug);
}

export async function getProducts(): Promise<Product[]> {
  const baris = await query<BarisProduk>(`${PILIH} ORDER BY c.sort_order, p.name`);
  return lengkapi(baris);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const baris = await query<BarisProduk>(`${PILIH} AND p.slug = ? LIMIT 1`, [slug]);
  return (await lengkapi(baris))[0];
}

export async function getByCategory(category: CategorySlug): Promise<Product[]> {
  const baris = await query<BarisProduk>(`${PILIH} AND c.slug = ? ORDER BY p.name`, [category]);
  return lengkapi(baris);
}

export async function getPackages(): Promise<Product[]> {
  return getByCategory("paket");
}

/**
 * Produk unggulan untuk beranda.
 *
 * Belum ada data penjualan, jadi urutannya belum bisa berdasarkan "paling
 * laris". Sementara ini: produk tersedia di luar kategori paket, diurutkan
 * berdasarkan kelengkapan foto — yang tampil adalah yang paling siap dipajang.
 */
export async function getFeatured(limit = 6): Promise<Product[]> {
  const baris = await query<BarisProduk>(
    `${PILIH} AND p.in_stock = 1 AND (c.slug IS NULL OR c.slug <> 'paket')
      ORDER BY (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) DESC, p.name
      LIMIT ${Number(limit) || 6}`,
  );
  return lengkapi(baris);
}

/**
 * Foto untuk hero beranda.
 *
 * Dipilih manual, bukan diambil dari urutan unggulan: foto hero harus
 * memperlihatkan makanannya, bukan kemasannya.
 */
export async function getHeroProduct(): Promise<Product | undefined> {
  for (const slug of ["biji-ketapang", "kue-satu", "semprong-unyil", "dodol-betawi"]) {
    const p = await getProduct(slug);
    if (p && p.images.length > 0) return p;
  }
  return (await getFeatured(1))[0];
}

/** Produk lain dari kategori yang sama, untuk "sering dibeli bersama". */
export async function getRelated(slug: string, limit = 6): Promise<Product[]> {
  const kini = await queryOne<{ id: number; category_id: number | null; price: number }>(
    `SELECT id, category_id, price FROM products WHERE slug = ? LIMIT 1`,
    [slug],
  );
  if (!kini) return [];

  const baris = await query<BarisProduk>(
    `${PILIH} AND p.id <> ? AND p.in_stock = 1
       AND (p.category_id <=> ?)
     ORDER BY ABS(CAST(p.price AS SIGNED) - ?)
     LIMIT ${Number(limit) || 6}`,
    [kini.id, kini.category_id, kini.price],
  );
  return lengkapi(baris);
}

export function countByCategory(list: Product[]): Record<CategorySlug, number> {
  return {
    makanan: list.filter((p) => p.category === "makanan").length,
    minuman: list.filter((p) => p.category === "minuman").length,
    paket: list.filter((p) => p.category === "paket").length,
  };
}

/**
 * Isi sebuah paket.
 *
 * Kosong untuk produk biasa, dan juga kosong untuk paket yang isinya belum
 * didaftarkan di panel admin. Halaman produk memakainya untuk menampilkan
 * daftar "Isi paket" dari data sungguhan, bukan dari teks deskripsi yang
 * tidak bisa diperiksa ulang.
 */
export async function getIsiPaketToko(
  slug: string,
): Promise<{ slug: string; name: string; qty: number; weightGram: number }[]> {
  return query(
    `SELECT isi.slug, isi.name, pi.qty, isi.weight_gram AS weightGram
       FROM package_items pi
       JOIN products paket ON paket.id = pi.package_id
       JOIN products isi   ON isi.id  = pi.product_id
      WHERE paket.slug = ?
      ORDER BY pi.sort_order, isi.name`,
    [slug],
  );
}
