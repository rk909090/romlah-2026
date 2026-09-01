import raw from "@/data/products.json";
import type { Category, CategorySlug, Product } from "./types";

/**
 * Satu-satunya pintu ke data katalog.
 *
 * Sekarang membaca berkas JSON hasil migrasi dari WooCommerce lama.
 * Saat database aktif, hanya berkas ini yang perlu diganti — halaman dan
 * komponen di atasnya tidak menyentuh sumber data secara langsung.
 * Semua fungsi sengaja dibuat async supaya penggantian itu tidak
 * mengubah tanda tangan fungsi di pemanggilnya.
 */
const products = raw as Product[];

export const CATEGORIES: Category[] = [
  { slug: "makanan", name: "Makanan", blurb: "Camilan dan kue kering khas Betawi" },
  { slug: "minuman", name: "Minuman", blurb: "Bir pletok dan madu" },
  { slug: "paket", name: "Paket", blurb: "Bundling hemat, siap jadi buah tangan" },
];

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  return products.find((p) => p.slug === slug);
}

export async function getByCategory(category: CategorySlug): Promise<Product[]> {
  return products.filter((p) => p.category === category);
}

export async function getPackages(): Promise<Product[]> {
  return products.filter((p) => p.category === "paket");
}

/**
 * Produk unggulan untuk beranda.
 *
 * Belum ada data penjualan, jadi urutannya belum bisa berdasarkan "paling
 * laris". Sementara ini: produk tersedia dari kategori makanan/minuman,
 * diurutkan berdasarkan kelengkapan foto lalu harga menengah lebih dulu —
 * yang tampil adalah produk yang paling siap dipajang.
 */
export async function getFeatured(limit = 6): Promise<Product[]> {
  return products
    .filter((p) => p.inStock && p.category !== "paket")
    .sort((a, b) => b.images.length - a.images.length || a.name.localeCompare(b.name, "id"))
    .slice(0, limit);
}

/**
 * Foto untuk hero beranda.
 *
 * Dipilih manual, bukan diambil dari urutan unggulan: foto hero harus
 * memperlihatkan makanannya, bukan kemasannya. Kalau produknya kelak dihapus,
 * fungsi ini jatuh ke produk unggulan pertama.
 */
export async function getHeroProduct(): Promise<Product | undefined> {
  const pilihan = ["biji-ketapang", "kue-satu", "semprong-unyil", "dodol-betawi"];
  for (const slug of pilihan) {
    const p = products.find((x) => x.slug === slug && x.images.length > 0);
    if (p) return p;
  }
  return (await getFeatured(1))[0];
}

/** Produk lain dari kategori yang sama, untuk bagian "lengkapi belanjaan". */
export async function getRelated(slug: string, limit = 6): Promise<Product[]> {
  const current = products.find((p) => p.slug === slug);
  if (!current) return [];
  return products
    .filter((p) => p.slug !== slug && p.category === current.category && p.inStock)
    .sort((a, b) => Math.abs(a.price - current.price) - Math.abs(b.price - current.price))
    .slice(0, limit);
}

export function countByCategory(list: Product[]): Record<CategorySlug, number> {
  return {
    makanan: list.filter((p) => p.category === "makanan").length,
    minuman: list.filter((p) => p.category === "minuman").length,
    paket: list.filter((p) => p.category === "paket").length,
  };
}
