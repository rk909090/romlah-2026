/** Jalankan setiap kueri aplikasi terhadap MariaDB sungguhan. */
import fs from "node:fs";
import mysql from "mysql2/promise";

const env = Object.fromEntries(
  fs
    .readFileSync("D:/Downloads/RK/romlah-web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1)]; }),
);

const c = await mysql.createConnection({
  host: env.DATABASE_HOST, port: +env.DATABASE_PORT,
  user: env.DATABASE_USER, password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME, connectTimeout: 20000,
});

const PILIH_TOKO = `
  SELECT p.id, p.legacy_id, p.slug, p.name, p.price, p.weight_gram,
         c.slug AS category, p.description, p.in_stock
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
   WHERE p.is_active = 1`;

const PILIH_ADMIN = `
  SELECT p.id, p.slug, p.name, p.price, p.weight_gram AS weightGram,
         p.category_id AS categoryId, c.slug AS categorySlug, c.name AS categoryName,
         COALESCE(p.description, '') AS description,
         p.in_stock, p.is_active, p.updated_at AS updatedAt,
         (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) AS imageCount,
         (SELECT i.src FROM product_images i WHERE i.product_id = p.id
           ORDER BY i.sort_order, i.id LIMIT 1) AS firstImage
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id`;

const uji = [
  ["toko: semua produk", `${PILIH_TOKO} ORDER BY c.sort_order, p.name`, []],
  ["toko: satu produk", `${PILIH_TOKO} AND p.slug = ? LIMIT 1`, ["kue-satu"]],
  ["toko: per kategori", `${PILIH_TOKO} AND c.slug = ? ORDER BY p.name`, ["paket"]],
  ["toko: unggulan (subkueri di ORDER BY)",
    `${PILIH_TOKO} AND p.in_stock = 1 AND (c.slug IS NULL OR c.slug <> 'paket')
      ORDER BY (SELECT COUNT(*) FROM product_images i WHERE i.product_id = p.id) DESC, p.name LIMIT 8`, []],
  ["toko: terkait (<=> null-safe + CAST)",
    `${PILIH_TOKO} AND p.id <> ? AND p.in_stock = 1 AND (p.category_id <=> ?)
      ORDER BY ABS(CAST(p.price AS SIGNED) - ?) LIMIT 4`, [1, 1, 45000]],
  ["toko: foto berdasarkan IN",
    `SELECT product_id, src, alt FROM product_images WHERE product_id IN (?,?,?) ORDER BY product_id, sort_order, id`, [1, 2, 3]],
  ["toko: kategori", `SELECT slug, name, blurb FROM categories ORDER BY sort_order, name`, []],
  ["admin: daftar produk", `${PILIH_ADMIN} ORDER BY p.updated_at DESC, p.name`, []],
  ["admin: tapis nama+kategori+status",
    `${PILIH_ADMIN} WHERE (p.name LIKE ? OR p.slug LIKE ?) AND c.slug = ? AND p.is_active = 1
      ORDER BY p.updated_at DESC, p.name`, ["%dodol%", "%dodol%", "makanan"]],
  ["admin: satu produk", `${PILIH_ADMIN} WHERE p.id = ? LIMIT 1`, [1]],
  ["admin: foto produk",
    `SELECT id, src, alt FROM product_images WHERE product_id = ? ORDER BY sort_order, id`, [1]],
  ["admin: kategori + hitungan",
    `SELECT c.id, c.slug, c.name,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS productCount
       FROM categories c ORDER BY c.sort_order, c.name`, []],
  ["admin: statistik dasbor",
    `SELECT
       (SELECT COUNT(*) FROM products WHERE is_active = 1) AS produkAktif,
       (SELECT COUNT(*) FROM products WHERE is_active = 0) AS produkArsip,
       (SELECT COUNT(*) FROM products WHERE is_active = 1 AND in_stock = 0) AS stokHabis,
       (SELECT COUNT(*) FROM products p WHERE p.is_active = 1
          AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)) AS tanpaFoto,
       (SELECT COUNT(*) FROM orders) AS totalPesanan`, []],
  ["admin: daftar pesanan",
    `SELECT id, order_number, channel, status, customer_name, customer_phone, total, created_at
       FROM orders ORDER BY created_at DESC LIMIT 100`, []],
  ["pelanggan: daftar + agregat",
    `SELECT c.id, c.phone, c.name, c.email, c.note,
            c.created_at AS createdAt, c.last_order_at AS lastOrderAt,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orderCount,
            COALESCE((SELECT SUM(o.total) FROM orders o
                       WHERE o.customer_id = c.id AND o.status NOT IN
                         ('dibatalkan','kedaluwarsa','dikembalikan')), 0) AS totalSpent
       FROM customers c ORDER BY c.last_order_at IS NULL, c.last_order_at DESC, c.name`, []],
  ["pelanggan: cari", `SELECT id FROM customers WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?`,
    ["%a%", "%628%", "%a%"]],
  ["pelanggan: alamat",
    `SELECT id, label, recipient_name, phone, address, destination_label, is_default
       FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, id DESC`, [0]],
  ["pelanggan: riwayat pesanan",
    `SELECT id, order_number, status, channel, total, created_at
       FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`, [0]],
  ["pelanggan: hitung", `SELECT COUNT(*) AS n FROM customers`, []],
  ["auth: cari admin", `SELECT id, password_hash FROM admin_users WHERE email = ? LIMIT 1`, ["x@y.z"]],
  ["auth: hitung admin", `SELECT COUNT(*) AS n FROM admin_users`, []],
  ["auth: sesi join pengguna",
    `SELECT u.id, u.email, u.name FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`, ["a".repeat(64)]],
  ["auth: sesi aktif",
    `SELECT created_at, expires_at, user_agent FROM admin_sessions
      WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC`, [0]],
  ["auth: bersihkan sesi", `DELETE FROM admin_sessions WHERE expires_at < NOW()`, []],
];

let gagal = 0;
for (const [nama, sql, params] of uji) {
  try {
    const [r] = await c.execute(sql, params);
    const n = Array.isArray(r) ? r.length : r.affectedRows;
    console.log(`  OK    ${nama.padEnd(42)} -> ${n} baris`);
  } catch (e) {
    gagal++;
    console.log(`  GAGAL ${nama}`);
    console.log(`        ${e.code}: ${e.sqlMessage ?? e.message}`);
  }
}

console.log(gagal === 0 ? "\nSemua kueri lolos." : `\n${gagal} kueri gagal.`);
await c.end();
process.exit(gagal === 0 ? 0 : 1);
