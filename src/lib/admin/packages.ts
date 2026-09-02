import { execute, query, queryOne, transaksi, type SqlParam } from "../db";

/**
 * Paket = produk di kategori "paket" yang isinya menunjuk ke produk lain.
 *
 * Dua hal yang membedakannya dari produk biasa:
 *
 *   1. Beratnya DIHITUNG dari isinya, tidak diketik. Berat yang salah
 *      langsung jadi ongkir yang salah, dan paket adalah barang yang paling
 *      mudah keliru ditaksir beratnya.
 *   2. Harganya TIDAK dihitung dari isinya. Potongan harga justru inti dari
 *      menjual paket, jadi harga tetap diisi tangan.
 *
 * Seluruh fungsi di berkas ini membaca produk apa adanya, tanpa saringan
 * kategori aktif — panel admin harus tetap bisa menyunting paket justru
 * ketika kategorinya sedang dimatikan.
 */

export type IsiPaket = {
  productId: number;
  slug: string;
  name: string;
  qty: number;
  weightGram: number;
  price: number;
  inStock: boolean;
};

export type Paket = {
  id: number;
  slug: string;
  name: string;
  price: number;
  weightGram: number;
  description: string;
  inStock: boolean;
  isActive: boolean;
  updatedAt: string;
  firstImage: string | null;
  jumlahIsi: number;
  /** Berat total dari isinya. 0 bila isinya belum didaftarkan. */
  beratIsi: number;
  /** Harga isi bila dibeli satuan — dipakai menghitung penghematan. */
  hargaSatuan: number;
  /** Berapa kali paket ini pernah masuk pesanan. Menentukan boleh dihapus. */
  dipakaiPesanan: number;
};

const PILIH = `
  SELECT p.id, p.slug, p.name, p.price, p.weight_gram AS weightGram,
         COALESCE(p.description, '') AS description,
         p.in_stock, p.is_active, p.updated_at AS updatedAt,
         (SELECT i.src FROM product_images i WHERE i.product_id = p.id
           ORDER BY i.sort_order, i.id LIMIT 1) AS firstImage,
         (SELECT COUNT(*) FROM package_items pi WHERE pi.package_id = p.id) AS jumlahIsi,
         COALESCE((SELECT SUM(isi.weight_gram * pi.qty)
                     FROM package_items pi JOIN products isi ON isi.id = pi.product_id
                    WHERE pi.package_id = p.id), 0) AS beratIsi,
         COALESCE((SELECT SUM(isi.price * pi.qty)
                     FROM package_items pi JOIN products isi ON isi.id = pi.product_id
                    WHERE pi.package_id = p.id), 0) AS hargaSatuan,
         (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) AS dipakaiPesanan
    FROM products p
    JOIN categories c ON c.id = p.category_id
   WHERE c.slug = 'paket'`;

type Baris = Omit<Paket, "inStock" | "isActive"> & { in_stock: number; is_active: number };

const petakan = (b: Baris): Paket => ({
  ...b,
  price: Number(b.price),
  weightGram: Number(b.weightGram),
  jumlahIsi: Number(b.jumlahIsi),
  beratIsi: Number(b.beratIsi),
  hargaSatuan: Number(b.hargaSatuan),
  dipakaiPesanan: Number(b.dipakaiPesanan),
  inStock: b.in_stock === 1,
  isActive: b.is_active === 1,
});

export async function listPaket(): Promise<Paket[]> {
  const baris = await query<Baris>(`${PILIH} ORDER BY p.is_active DESC, p.name`);
  return baris.map(petakan);
}

export async function getPaket(id: number): Promise<Paket | undefined> {
  const b = await queryOne<Baris>(`${PILIH} AND p.id = ? LIMIT 1`, [id]);
  return b ? petakan(b) : undefined;
}

export async function getIsiPaket(packageId: number): Promise<IsiPaket[]> {
  const baris = await query<{
    productId: number;
    slug: string;
    name: string;
    qty: number;
    weightGram: number;
    price: number;
    in_stock: number;
  }>(
    `SELECT isi.id AS productId, isi.slug, isi.name, pi.qty,
            isi.weight_gram AS weightGram, isi.price, isi.in_stock
       FROM package_items pi
       JOIN products isi ON isi.id = pi.product_id
      WHERE pi.package_id = ?
      ORDER BY pi.sort_order, isi.name`,
    [packageId],
  );
  return baris.map((b) => ({
    productId: b.productId,
    slug: b.slug,
    name: b.name,
    qty: Number(b.qty),
    weightGram: Number(b.weightGram),
    price: Number(b.price),
    inStock: b.in_stock === 1,
  }));
}

/** Produk yang boleh dijadikan isi paket: semua produk aktif di luar paket. */
export async function listCalonIsi(): Promise<
  { id: number; name: string; price: number; weightGram: number; inStock: boolean }[]
> {
  const baris = await query<{
    id: number;
    name: string;
    price: number;
    weightGram: number;
    in_stock: number;
  }>(
    `SELECT p.id, p.name, p.price, p.weight_gram AS weightGram, p.in_stock
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND (c.slug IS NULL OR c.slug <> 'paket')
      ORDER BY p.name`,
  );
  return baris.map((b) => ({
    id: b.id,
    name: b.name,
    price: Number(b.price),
    weightGram: Number(b.weightGram),
    inStock: b.in_stock === 1,
  }));
}

export type InputPaket = {
  slug: string;
  name: string;
  price: number;
  description: string;
  inStock: boolean;
  isActive: boolean;
  /** Berat cadangan, dipakai hanya bila paketnya belum punya isi. */
  weightGram: number;
  isi: { productId: number; qty: number }[];
};

async function idKategoriPaket(): Promise<number> {
  const b = await queryOne<{ id: number }>(`SELECT id FROM categories WHERE slug = 'paket' LIMIT 1`);
  if (!b) throw new Error("Kategori 'paket' tidak ada di basis data.");
  return b.id;
}

/**
 * Simpan paket beserta isinya dalam satu transaksi.
 *
 * Isi ditulis ulang seluruhnya (hapus lalu sisipkan), bukan dibandingkan
 * baris per baris: jumlahnya kecil, dan cara ini tidak bisa meninggalkan
 * baris yatim kalau ada yang dihapus dari formulir.
 *
 * Berat produk ikut ditulis dari total berat isinya. Ini yang membuat janji
 * "berat dihitung otomatis" di beranda benar-benar berlaku.
 */
export async function simpanPaket(id: number | null, input: InputPaket): Promise<number> {
  const kategori = await idKategoriPaket();

  return transaksi(async (tx) => {
    let paketId = id;

    // Berat dari isi lebih dipercaya daripada angka yang diketik. Kalau
    // paketnya belum punya isi, barulah angka dari formulir dipakai.
    let berat = input.weightGram;
    if (input.isi.length > 0) {
      const ids = input.isi.map((i) => i.productId);
      const bobot = await tx.query<{ id: number; weight_gram: number }>(
        `SELECT id, weight_gram FROM products WHERE id IN (${ids.map(() => "?").join(",")})`,
        ids as SqlParam[],
      );
      const peta = new Map(bobot.map((b) => [Number(b.id), Number(b.weight_gram)]));
      const kurang = input.isi.filter((i) => !peta.has(i.productId));
      if (kurang.length > 0) throw new Error("Ada isi paket yang produknya sudah tidak ada.");
      berat = input.isi.reduce((n, i) => n + (peta.get(i.productId) ?? 0) * i.qty, 0);
    }
    if (berat <= 0) throw new Error("Berat paket harus lebih dari 0 gram.");

    if (paketId) {
      await tx.execute(
        `UPDATE products
            SET slug = ?, name = ?, price = ?, weight_gram = ?, category_id = ?,
                description = ?, in_stock = ?, is_active = ?
          WHERE id = ?`,
        [
          input.slug, input.name, input.price, berat, kategori,
          input.description, input.inStock ? 1 : 0, input.isActive ? 1 : 0, paketId,
        ],
      );
    } else {
      const { insertId } = await tx.execute(
        `INSERT INTO products (slug, name, price, weight_gram, category_id, description, in_stock, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.slug, input.name, input.price, berat, kategori,
          input.description, input.inStock ? 1 : 0, input.isActive ? 1 : 0,
        ],
      );
      paketId = insertId;
    }

    await tx.execute(`DELETE FROM package_items WHERE package_id = ?`, [paketId]);
    for (const [n, i] of input.isi.entries()) {
      await tx.execute(
        `INSERT INTO package_items (package_id, product_id, qty, sort_order) VALUES (?, ?, ?, ?)`,
        [paketId, i.productId, i.qty, n],
      );
    }

    return paketId;
  });
}

/**
 * Hapus paket.
 *
 * Benar-benar dihapus hanya bila belum pernah masuk pesanan. Kalau sudah,
 * paketnya diarsipkan: baris pesanan lama menunjuk ke produk ini lewat kunci
 * asing, dan menghapusnya akan melubangi riwayat penjualan.
 */
export async function hapusPaket(id: number): Promise<"dihapus" | "diarsipkan"> {
  const b = await queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM order_items WHERE product_id = ?`,
    [id],
  );
  if (Number(b?.n ?? 0) > 0) {
    await execute(`UPDATE products SET is_active = 0 WHERE id = ?`, [id]);
    return "diarsipkan";
  }

  // package_items ikut terhapus lewat ON DELETE CASCADE, begitu juga fotonya.
  await execute(`DELETE FROM products WHERE id = ?`, [id]);
  return "dihapus";
}

/* ── Nyala/mati kategori ─────────────────────────────────────────────── */

export type StatusKategori = {
  id: number;
  slug: string;
  name: string;
  isActive: boolean;
  jumlahProduk: number;
};

export async function listStatusKategori(): Promise<StatusKategori[]> {
  const baris = await query<{
    id: number;
    slug: string;
    name: string;
    is_active: number;
    jumlahProduk: number;
  }>(
    `SELECT c.id, c.slug, c.name, c.is_active,
            (SELECT COUNT(*) FROM products p
              WHERE p.category_id = c.id AND p.is_active = 1) AS jumlahProduk
       FROM categories c ORDER BY c.sort_order, c.name`,
  );
  return baris.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    isActive: b.is_active === 1,
    jumlahProduk: Number(b.jumlahProduk),
  }));
}

export async function setKategoriAktif(slug: string, aktif: boolean): Promise<number> {
  const { affectedRows } = await execute(`UPDATE categories SET is_active = ? WHERE slug = ?`, [
    aktif ? 1 : 0,
    slug,
  ]);
  return affectedRows;
}
