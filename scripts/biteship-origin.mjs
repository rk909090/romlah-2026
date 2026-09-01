/**
 * Cari ID area Biteship untuk outlet asal, lalu salin ke
 * BITESHIP_ORIGIN_AREA_ID di .env.local dan di panel Hostinger.
 *
 *   node scripts/biteship-origin.mjs
 *   node scripts/biteship-origin.mjs 12530
 *
 * Sekaligus memeriksa apakah kunci API sudah benar. Pencarian Biteship
 * bekerja paling andal dengan KODE POS — nama kelurahan sering meleset
 * karena Biteship hanya turun sampai tingkat kecamatan.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const KEY = process.env.BITESHIP_API_KEY?.trim();
if (!KEY) {
  console.error("BITESHIP_API_KEY belum diisi di .env.local");
  process.exit(1);
}

const cari = process.argv[2] ?? "12530";
const url = `https://api.biteship.com/v1/maps/areas?countries=ID&input=${encodeURIComponent(cari)}&type=single`;

const r = await fetch(url, { headers: { Authorization: KEY } });
const j = await r.json().catch(() => null);

if (!r.ok || !j?.success) {
  console.error(`Gagal (HTTP ${r.status}):`, j?.error ?? "jawaban tidak terbaca");
  process.exit(1);
}

console.log(`Hasil untuk "${cari}" — salin ID yang benar:\n`);
for (const a of j.areas ?? []) {
  console.log(`  BITESHIP_ORIGIN_AREA_ID=${a.id}`);
  console.log(`      ${a.name}`);
}
if (!j.areas?.length) console.log("  (tidak ada hasil — coba kode pos)");
