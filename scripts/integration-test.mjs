/**
 * Uji integrasi: pesanan sungguhan memakai tarif Biteship sungguhan.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/integration-test.mjs
 *
 * Berbeda dari order-test.mjs yang sengaja memakai tarif contoh, uji ini
 * benar-benar memanggil Biteship. Data ujinya memakai nomor 62899999… dan
 * dihapus di akhir, termasuk bila ada langkah yang gagal di tengah.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { cariTujuan, hitungOngkir, pakaiContoh } = await import("../src/lib/shipping.ts");
const { simpanPesanan, getPesananByNomor, getBarisPesanan } = await import("../src/lib/orders.ts");
const { query, execute, pool } = await import("../src/lib/db.ts");

let gagal = 0;
const cek = (n, ok, d = "") => {
  if (!ok) gagal++;
  console.log(`  ${ok ? "OK   " : "GAGAL"} ${n}${d ? "  → " + d : ""}`);
};

const TEL = "0899999" + String(Date.now()).slice(-6);
const BAKU = "62" + TEL.slice(1);

async function bersihkan() {
  const o = await query(`SELECT id FROM orders WHERE customer_phone = ?`, [BAKU]);
  for (const r of o) await execute(`DELETE FROM orders WHERE id = ?`, [r.id]);
  await execute(`DELETE FROM customers WHERE phone = ?`, [BAKU]);
}

try {
  cek("memakai Biteship sungguhan, bukan contoh", pakaiContoh() === false);

  const tujuan = (await cariTujuan("12730"))[0];
  cek("tujuan ditemukan", Boolean(tujuan), tujuan?.label);

  const produk = await query(
    `SELECT slug, price, weight_gram FROM products WHERE is_active=1 AND in_stock=1 ORDER BY id LIMIT 2`,
  );
  const beratTotal = Number(produk[0].weight_gram) * 2 + Number(produk[1].weight_gram);

  const tarif = await hitungOngkir(tujuan, beratTotal);
  cek(
    "tarif sungguhan diterima",
    tarif.length > 0,
    `${tarif.length} layanan, termurah ${tarif[0]?.code}/${tarif[0]?.service} Rp ${tarif[0]?.cost}`,
  );

  const dipilih = tarif[0];
  const hasil = await simpanPesanan({
    items: [
      { slug: produk[0].slug, qty: 2 },
      { slug: produk[1].slug, qty: 1 },
    ],
    nama: "Penguji Integrasi",
    telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1",
    tujuan,
    kurirKode: dipilih.code,
    kurirLayanan: dipilih.service,
  });

  cek("pesanan tersimpan dengan kurir sungguhan", Boolean(hasil.orderNumber), hasil.orderNumber);
  cek("ongkir tersimpan sama dengan tarif Biteship", hasil.shippingCost === dipilih.cost, `${hasil.shippingCost} vs ${dipilih.cost}`);
  cek("nama kurir tersimpan", hasil.kurir === dipilih.name, `${hasil.kurir} ${hasil.layanan}`);

  const db = await getPesananByNomor(hasil.orderNumber);
  cek("destination_id string tersimpan utuh", db?.destination_id === tujuan.id, String(db?.destination_id));
  cek("ongkir di basis data cocok", Number(db?.shipping_cost) === dipilih.cost);
  cek("total di basis data cocok", Number(db?.total) === hasil.subtotal + dipilih.cost);
  cek("baris barang tersimpan", (await getBarisPesanan(db.id)).length === 2);

  const alamat = await query(`SELECT destination_id FROM customer_addresses WHERE phone = ?`, [BAKU]);
  cek("destination_id pada alamat pelanggan utuh", alamat[0]?.destination_id === tujuan.id, String(alamat[0]?.destination_id));

  // Layanan yang tidak ada dalam jawaban Biteship harus ditolak.
  try {
    await simpanPesanan({
      items: [{ slug: produk[0].slug, qty: 1 }],
      nama: "X",
      telepon: TEL,
      alamat: "y",
      tujuan,
      kurirKode: dipilih.code,
      kurirLayanan: "LAYANAN-PALSU",
    });
    cek("layanan palsu ditolak", false, "justru tersimpan");
  } catch (e) {
    cek("layanan palsu ditolak", true, e.message.slice(0, 46));
  }
} catch (e) {
  gagal++;
  console.log("  GAGAL uji terhenti:", e.message);
} finally {
  await bersihkan();
  const sisa = await query(`SELECT id FROM orders WHERE customer_phone = ?`, [BAKU]);
  cek("data uji terhapus bersih", sisa.length === 0);
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
