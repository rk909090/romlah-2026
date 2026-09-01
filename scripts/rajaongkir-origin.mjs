/**
 * Cari ID tujuan RajaOngkir untuk outlet asal, lalu salin ke
 * RAJAONGKIR_ORIGIN_ID di .env.local dan di panel Hostinger.
 *
 *   node scripts/rajaongkir-origin.mjs
 *   node scripts/rajaongkir-origin.mjs "kata kunci lain"
 *
 * Sekaligus memeriksa apakah kunci API sudah benar.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const KEY = process.env.RAJAONGKIR_API_KEY?.trim();
if (!KEY) {
  console.error("RAJAONGKIR_API_KEY belum diisi di .env.local");
  process.exit(1);
}

const cari = process.argv[2] ?? "tanjung barat";
const url =
  "https://rajaongkir.komerce.id/api/v1/destination/domestic-destination" +
  `?search=${encodeURIComponent(cari)}&limit=20&offset=0`;

const r = await fetch(url, { headers: { key: KEY } });
const j = await r.json().catch(() => null);

if (!r.ok || !j?.data) {
  console.error(`Gagal (HTTP ${r.status}):`, j?.meta?.message ?? "jawaban tidak terbaca");
  console.error("\nPeriksa kembali kunci di dasbor RajaOngkir. Kunci V2 jauh lebih panjang");
  console.error("daripada 15 karakter, jadi kunci pendek biasanya tersalin sebagian.");
  process.exit(1);
}

console.log(`Hasil untuk "${cari}" — salin ID yang benar:\n`);
for (const d of j.data) {
  console.log(`  RAJAONGKIR_ORIGIN_ID=${String(d.id).padEnd(8)} ${d.label}`);
}
if (j.data.length === 0) console.log("  (tidak ada hasil — coba kata kunci lain)");
