/**
 * Dorong deskripsi produk dari src/data/products.json ke basis data.
 *
 *   node scripts/sync-deskripsi.mjs            # tampilkan bedanya saja
 *   node scripts/sync-deskripsi.mjs --tulis    # baru benar-benar menulis
 *
 * Sengaja TIDAK memakai db-setup.mjs untuk ini. db-setup menimpa nama, harga,
 * berat, dan status stok sekaligus — kalau ada produk yang sudah disunting
 * lewat panel admin, suntingannya ikut hilang. Skrip ini hanya menyentuh
 * kolom description.
 */
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const root = path.resolve(import.meta.dirname, "..");
const tulis = process.argv.includes("--tulis");

for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const produk = JSON.parse(fs.readFileSync(path.join(root, "src/data/products.json"), "utf8"));

const conn = await mysql.createConnection({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectTimeout: 20000,
});

const [baris] = await conn.query("SELECT slug, description FROM products");
const diDb = new Map(baris.map((r) => [r.slug, r.description ?? ""]));

let berubah = 0;
let sama = 0;
const hilang = [];

for (const p of produk) {
  const baru = p.description.join("\n");
  if (!diDb.has(p.slug)) {
    hilang.push(p.slug);
    continue;
  }
  if (diDb.get(p.slug) === baru) {
    sama++;
    continue;
  }
  berubah++;
  console.log(`${tulis ? "TULIS" : "BEDA "} ${p.slug}`);
  if (tulis) {
    const [hasil] = await conn.execute("UPDATE products SET description = ? WHERE slug = ?", [baru, p.slug]);
    if (hasil.affectedRows !== 1) {
      console.error(`  GAGAL: ${hasil.affectedRows} baris terpengaruh, seharusnya 1`);
      process.exitCode = 1;
    }
  }
}

const cumaDiDb = [...diDb.keys()].filter((s) => !produk.some((p) => p.slug === s));

console.log("");
console.log(`Sama       : ${sama}`);
console.log(`${tulis ? "Ditulis    " : "Perlu ubah "}: ${berubah}`);
if (hilang.length) console.log(`Ada di JSON tapi tidak di DB: ${hilang.join(", ")}`);
if (cumaDiDb.length) console.log(`Ada di DB tapi tidak di JSON: ${cumaDiDb.join(", ")}`);

if (tulis) {
  // Baca ulang dari basis data — bukan percaya pada affectedRows saja.
  const [ulang] = await conn.query("SELECT slug, description FROM products");
  const sesudah = new Map(ulang.map((r) => [r.slug, r.description ?? ""]));
  const meleset = produk.filter((p) => sesudah.get(p.slug) !== p.description.join("\n"));
  console.log(
    meleset.length === 0
      ? "Diverifikasi: seluruh deskripsi di basis data sama persis dengan products.json."
      : `MASIH BEDA setelah menulis: ${meleset.map((p) => p.slug).join(", ")}`,
  );
  if (meleset.length) process.exitCode = 1;
}

await conn.end();
