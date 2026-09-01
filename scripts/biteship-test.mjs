/**
 * Uji lapisan ongkir terhadap Biteship sungguhan.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/biteship-test.mjs
 *
 * Tidak membuat pengiriman apa pun — hanya pencarian area dan permintaan
 * tarif, keduanya operasi baca.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { cariTujuan, hitungOngkir, pakaiContoh, ORIGIN_AREA_ID, ShippingError } = await import(
  "../src/lib/shipping.ts"
);

let gagal = 0;
const cek = (nama, lulus, detail = "") => {
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "OK   " : "GAGAL"} ${nama}${detail ? "  → " + detail : ""}`);
};

console.log(`Mode contoh: ${pakaiContoh()} | area asal: ${ORIGIN_AREA_ID || "(belum diisi)"}\n`);

/* ── Pencarian area ───────────────────────────────────────────────── */
const hasil = await cariTujuan("12730");
cek("pencarian kode pos mengembalikan hasil", hasil.length > 0, `${hasil.length} area`);
if (hasil[0]) {
  cek("ID area berupa string", typeof hasil[0].id === "string", hasil[0].id);
  cek("label terisi", hasil[0].label.length > 0, hasil[0].label);
  cek("kota terisi", hasil[0].city.length > 0, hasil[0].city);
  cek("kode pos terisi", hasil[0].postalCode.length > 0, hasil[0].postalCode);
}

cek("kata kunci terlalu pendek dikembalikan kosong", (await cariTujuan("ab")).length === 0);

/* ── Tarif ────────────────────────────────────────────────────────── */
if (hasil[0]) {
  try {
    const tarif = await hitungOngkir(hasil[0], 1100);
    cek("tarif diterima", tarif.length > 0, `${tarif.length} layanan`);
    for (const t of tarif.slice(0, 8)) {
      console.log(`         ${t.code.padEnd(9)} ${t.service.padEnd(14)} Rp ${String(t.cost).padStart(7)}  ${t.etd}`);
    }
    cek("semua tarif punya biaya > 0", tarif.every((t) => t.cost > 0));
    cek("tarif urut dari termurah", tarif.every((t, i) => i === 0 || tarif[i - 1].cost <= t.cost));
  } catch (e) {
    const pesanSaldo = e instanceof ShippingError && /balance/i.test(e.message);
    console.log(`  ${pesanSaldo ? "TERTAHAN" : "GAGAL   "} perhitungan tarif`);
    console.log(`           ${e.message}`);
    if (pesanSaldo) {
      console.log("\n  Akun Biteship perlu diisi saldo sebelum API tarif bisa dipakai.");
      console.log("  Pencarian area sudah berjalan, jadi kunci API-nya sendiri sah.");
    } else {
      gagal++;
    }
  }
}

console.log(gagal === 0 ? "\nSemua uji yang bisa dijalankan lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
