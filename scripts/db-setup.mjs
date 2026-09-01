/**
 * Siapkan basis data: terapkan skema, lalu isi kategori dan produk.
 *
 *   node scripts/db-setup.mjs
 *
 * Membaca kredensial dari .env.local (atau berkas yang diberikan lewat
 * argumen pertama). Aman dijalankan berulang: skema memakai IF NOT EXISTS
 * dan seed memakai INSERT ... ON DUPLICATE KEY UPDATE.
 *
 * Skrip ini TIDAK membuat pengguna admin. Admin pertama dibuat lewat
 * halaman /admin/setup supaya kata sandinya tidak pernah melewati berkas,
 * riwayat perintah, atau repositori.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = path.resolve(import.meta.dirname, "..");
const envPath = process.argv[2] ?? path.join(root, ".env.local");

function muatEnv(file) {
  if (!fs.existsSync(file)) {
    console.error(`Berkas env tidak ditemukan: ${file}`);
    process.exit(1);
  }
  for (const baris of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!baris || baris.trimStart().startsWith("#")) continue;
    const i = baris.indexOf("=");
    if (i === -1) continue;
    const k = baris.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = baris.slice(i + 1).trim();
  }
}

muatEnv(envPath);

const wajib = ["DATABASE_HOST", "DATABASE_PORT", "DATABASE_NAME", "DATABASE_USER", "DATABASE_PASSWORD"];
const kurang = wajib.filter((k) => !process.env[k]);
if (kurang.length) {
  console.error("Variabel env belum lengkap:", kurang.join(", "));
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectTimeout: 20000,
  multipleStatements: true, // hanya untuk berkas skema milik kita sendiri
});

console.log(`Terhubung ke ${process.env.DATABASE_NAME} di ${process.env.DATABASE_HOST}`);

/* ── 1. Skema ─────────────────────────────────────────────────────── */
const skema = fs.readFileSync(path.join(root, "src/db/schema.sql"), "utf8");
await conn.query(skema);
const [tabel] = await conn.query("SHOW TABLES");
console.log(`Skema diterapkan. Tabel: ${tabel.map((r) => Object.values(r)[0]).join(", ")}`);

/* ── 2. Kategori ──────────────────────────────────────────────────── */
const KATEGORI = [
  { slug: "makanan", name: "Makanan", blurb: "Camilan dan kue kering khas Betawi", sort_order: 1 },
  { slug: "minuman", name: "Minuman", blurb: "Bir pletok dan madu", sort_order: 2 },
  { slug: "paket", name: "Paket", blurb: "Bundling hemat, siap jadi buah tangan", sort_order: 3 },
];

for (const k of KATEGORI) {
  await conn.execute(
    `INSERT INTO categories (slug, name, blurb, sort_order) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), blurb = VALUES(blurb), sort_order = VALUES(sort_order)`,
    [k.slug, k.name, k.blurb, k.sort_order],
  );
}
const [kategoriBaris] = await conn.query("SELECT id, slug FROM categories");
const idKategori = Object.fromEntries(kategoriBaris.map((r) => [r.slug, r.id]));
console.log(`Kategori: ${Object.keys(idKategori).join(", ")}`);

/* ── 3. Produk + foto ─────────────────────────────────────────────── */
const produk = JSON.parse(fs.readFileSync(path.join(root, "src/data/products.json"), "utf8"));

let diproses = 0;
let fotoTotal = 0;

for (const p of produk) {
  const [hasil] = await conn.execute(
    `INSERT INTO products
       (slug, name, price, weight_gram, category_id, description, in_stock, is_active, legacy_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name), price = VALUES(price), weight_gram = VALUES(weight_gram),
       category_id = VALUES(category_id), description = VALUES(description),
       in_stock = VALUES(in_stock), legacy_id = VALUES(legacy_id)`,
    [
      p.slug,
      p.name,
      p.price,
      p.weightGram,
      idKategori[p.category] ?? null,
      p.description.join("\n"),
      p.inStock ? 1 : 0,
      p.legacyId ?? null,
    ],
  );
  // Jumlah baris terpengaruh dari ON DUPLICATE KEY UPDATE tidak bisa
  // diandalkan untuk membedakan sisip dan perbarui, jadi tidak dilaporkan
  // sebagai angka yang seolah pasti.
  void hasil;
  diproses++;

  const [[row]] = await conn.execute("SELECT id FROM products WHERE slug = ?", [p.slug]);
  for (const [i, img] of p.images.entries()) {
    await conn.execute(
      `INSERT INTO product_images (product_id, src, alt, sort_order) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE alt = VALUES(alt), sort_order = VALUES(sort_order)`,
      [row.id, img.src, img.alt, i],
    );
    fotoTotal++;
  }
}

const [[hitung]] = await conn.query(
  `SELECT (SELECT COUNT(*) FROM products) produk,
          (SELECT COUNT(*) FROM product_images) foto,
          (SELECT COUNT(*) FROM admin_users) admin`,
);

console.log(`Produk  : ${diproses} baris diproses`);
console.log(`Foto    : ${fotoTotal} baris diproses`);
console.log("");
console.log(`Isi basis data sekarang: ${hitung.produk} produk, ${hitung.foto} foto, ${hitung.admin} admin.`);
if (hitung.admin === 0) {
  console.log("");
  console.log("Belum ada pengguna admin. Buka /admin/setup untuk membuat yang pertama.");
}

await conn.end();
