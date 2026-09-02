import { execute, query, queryOne, transaksi, type SqlParam } from "../db";
import type { CategorySlug } from "../types";

/** Bentuk produk untuk panel admin — mentah, tanpa penyesuaian tampilan toko. */
export type AdminProduct = {
  id: number;
  slug: string;
  name: string;
  price: number;
  weightGram: number;
  categoryId: number | null;
  categorySlug: CategorySlug | null;
  categoryName: string | null;
  description: string;
  inStock: boolean;
  isActive: boolean;
  imageCount: number;
  firstImage: string | null;
  updatedAt: string;
};

export type AdminCategory = {
  id: number;
  slug: CategorySlug;
  name: string;
  productCount: number;
  /** Kategori yang dimatikan tidak tampil di toko sama sekali. */
  isActive: boolean;
};

type Baris = Omit<AdminProduct, "inStock" | "isActive"> & {
  in_stock: number;
  is_active: number;
};

const PILIH = `
  SELECT p.id, p.slug, p.name, p.price, p.weight_gram AS weightGram,
         p.category_id AS categoryId, c.slug AS categorySlug, c.name AS categoryName,
         COALESCE(p.description, '') AS description,
         p.in_stock, p.is_active, p.updated_at AS updatedAt,
         (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) AS imageCount,
         (SELECT i.src FROM product_images i WHERE i.product_id = p.id
           ORDER BY i.sort_order, i.id LIMIT 1) AS firstImage
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id`;

const petakan = (b: Baris): AdminProduct => ({
  ...b,
  price: Number(b.price),
  weightGram: Number(b.weightGram),
  imageCount: Number(b.imageCount),
  inStock: b.in_stock === 1,
  isActive: b.is_active === 1,
});

export type FilterProduk = {
  q?: string;
  kategori?: string;
  status?: "aktif" | "arsip" | "habis";
};

/**
 * Bangun WHERE sekali, dipakai daftar maupun hitungan.
 *
 * Dipisah supaya jumlah total tidak mungkin memakai saringan yang berbeda
 * dari tabelnya — dua kueri dengan syarat yang menyimpang membuat paging
 * menunjukkan halaman yang isinya tidak ada.
 */
function syaratProduk(f: FilterProduk): { where: string; nilai: SqlParam[] } {
  const syarat: string[] = [];
  const nilai: SqlParam[] = [];

  if (f.q) {
    syarat.push("(p.name LIKE ? OR p.slug LIKE ?)");
    nilai.push(`%${f.q}%`, `%${f.q}%`);
  }
  if (f.kategori) {
    syarat.push("c.slug = ?");
    nilai.push(f.kategori);
  }
  if (f.status === "aktif") syarat.push("p.is_active = 1");
  if (f.status === "arsip") syarat.push("p.is_active = 0");
  if (f.status === "habis") syarat.push("p.in_stock = 0");

  return { where: syarat.length ? ` WHERE ${syarat.join(" AND ")}` : "", nilai };
}

export async function listProducts(
  f: FilterProduk = {},
  paging?: { per: number; lewati: number },
): Promise<AdminProduct[]> {
  const { where, nilai } = syaratProduk(f);
  // LIMIT/OFFSET disisipkan sebagai ANGKA yang sudah dibulatkan, bukan
  // parameter terikat: MariaDB menolak placeholder di posisi ini pada
  // pernyataan yang disiapkan.
  const batas = paging
    ? ` LIMIT ${Math.max(1, Math.floor(paging.per))} OFFSET ${Math.max(0, Math.floor(paging.lewati))}`
    : "";
  const baris = await query<Baris>(
    `${PILIH}${where} ORDER BY p.updated_at DESC, p.name${batas}`,
    nilai,
  );
  return baris.map(petakan);
}

export async function countProducts(f: FilterProduk = {}): Promise<number> {
  const { where, nilai } = syaratProduk(f);
  const b = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM products p LEFT JOIN categories c ON c.id = p.category_id${where}`,
    nilai,
  );
  return Number(b?.n ?? 0);
}

export async function getAdminProduct(id: number): Promise<AdminProduct | undefined> {
  const b = await queryOne<Baris>(`${PILIH} WHERE p.id = ? LIMIT 1`, [id]);
  return b ? petakan(b) : undefined;
}

export async function getProductImages(
  productId: number,
): Promise<{ id: number; src: string; alt: string }[]> {
  return query(
    `SELECT id, src, alt FROM product_images WHERE product_id = ? ORDER BY sort_order, id`,
    [productId],
  );
}

/**
 * Seluruh kategori, TERMASUK yang sedang dimatikan.
 *
 * Berbeda dari getCategories() di lib/catalog, yang hanya mengembalikan
 * kategori tayang. Panel admin justru harus tetap melihat kategori yang
 * dimatikan — kalau tidak, produk di dalamnya jadi tidak bisa disunting.
 */
export async function listCategories(): Promise<AdminCategory[]> {
  const baris = await query<{
    id: number;
    slug: CategorySlug;
    name: string;
    productCount: number;
    is_active: number;
  }>(
    `SELECT c.id, c.slug, c.name, c.is_active,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS productCount
       FROM categories c ORDER BY c.sort_order, c.name`,
  );
  return baris.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    productCount: Number(b.productCount),
    isActive: b.is_active === 1,
  }));
}

export type InputProduk = {
  slug: string;
  name: string;
  price: number;
  weightGram: number;
  categoryId: number | null;
  description: string;
  inStock: boolean;
  isActive: boolean;
};

export async function createProduct(input: InputProduk): Promise<number> {
  const { insertId } = await execute(
    `INSERT INTO products (slug, name, price, weight_gram, category_id, description, in_stock, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.slug,
      input.name,
      input.price,
      input.weightGram,
      input.categoryId,
      input.description,
      input.inStock ? 1 : 0,
      input.isActive ? 1 : 0,
    ],
  );
  return insertId;
}

export async function updateProduct(id: number, input: InputProduk): Promise<void> {
  await execute(
    `UPDATE products
        SET slug = ?, name = ?, price = ?, weight_gram = ?, category_id = ?,
            description = ?, in_stock = ?, is_active = ?
      WHERE id = ?`,
    [
      input.slug,
      input.name,
      input.price,
      input.weightGram,
      input.categoryId,
      input.description,
      input.inStock ? 1 : 0,
      input.isActive ? 1 : 0,
      id,
    ],
  );
}

/**
 * Produk tidak pernah benar-benar dihapus, hanya diarsipkan.
 * Baris pesanan lama menunjuk ke produk lewat foreign key; menghapusnya
 * akan memutus riwayat penjualan.
 */
export async function archiveProduct(id: number): Promise<void> {
  await execute(`UPDATE products SET is_active = 0 WHERE id = ?`, [id]);
}

export async function restoreProduct(id: number): Promise<void> {
  await execute(`UPDATE products SET is_active = 1 WHERE id = ?`, [id]);
}

/** Angka ringkas untuk dasbor. */
export async function getDashboardStats() {
  const s = await queryOne<{
    produkAktif: number;
    produkArsip: number;
    stokHabis: number;
    tanpaFoto: number;
    totalPesanan: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM products WHERE is_active = 1) AS produkAktif,
       (SELECT COUNT(*) FROM products WHERE is_active = 0) AS produkArsip,
       (SELECT COUNT(*) FROM products WHERE is_active = 1 AND in_stock = 0) AS stokHabis,
       (SELECT COUNT(*) FROM products p WHERE p.is_active = 1
          AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)) AS tanpaFoto,
       (SELECT COUNT(*) FROM orders) AS totalPesanan`,
  );
  return {
    produkAktif: Number(s?.produkAktif ?? 0),
    produkArsip: Number(s?.produkArsip ?? 0),
    stokHabis: Number(s?.stokHabis ?? 0),
    tanpaFoto: Number(s?.tanpaFoto ?? 0),
    totalPesanan: Number(s?.totalPesanan ?? 0),
  };
}

/* ── Produk unggulan pilihan admin ──────────────────────────────────── */

export type ProdukUnggulan = {
  id: number;
  name: string;
  price: number;
  firstImage: string | null;
  inStock: boolean;
  rank: number;
};

/** Produk yang sedang diunggulkan, urut sesuai peringkatnya. */
export async function listUnggulan(): Promise<ProdukUnggulan[]> {
  const baris = await query<{
    id: number; name: string; price: number; in_stock: number;
    firstImage: string | null; featured_rank: number;
  }>(
    `SELECT p.id, p.name, p.price, p.in_stock, p.featured_rank,
            (SELECT i.src FROM product_images i WHERE i.product_id = p.id
              ORDER BY i.sort_order, i.id LIMIT 1) AS firstImage
       FROM products p
      WHERE p.featured_rank IS NOT NULL
      ORDER BY p.featured_rank, p.name`,
  );
  return baris.map((b) => ({
    id: b.id,
    name: b.name,
    price: Number(b.price),
    firstImage: b.firstImage,
    inStock: b.in_stock === 1,
    rank: Number(b.featured_rank),
  }));
}

/**
 * Ganti seluruh daftar unggulan.
 *
 * Ditulis ulang total, bukan dibandingkan baris per baris: jumlahnya kecil,
 * dan cara ini tidak bisa meninggalkan peringkat yatim kalau ada produk yang
 * dikeluarkan dari daftar.
 *
 * Larik kosong berarti kembali ke urutan otomatis di beranda.
 */
export async function setUnggulan(ids: number[]): Promise<void> {
  await transaksi(async (tx) => {
    await tx.execute(`UPDATE products SET featured_rank = NULL WHERE featured_rank IS NOT NULL`);
    for (const [n, id] of ids.entries()) {
      await tx.execute(`UPDATE products SET featured_rank = ? WHERE id = ?`, [n, id]);
    }
  });
}
