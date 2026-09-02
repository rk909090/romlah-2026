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
const { getPengaturan, simpanPengaturan } = await import("../src/lib/settings.ts");
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

// Pengaturan asli disalin supaya bisa dikembalikan persis, apa pun yang
// terjadi di tengah uji.
const setAwal = await getPengaturan();

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
    email: "penguji@contoh.test",
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

  cek("email tersimpan di pesanan", db?.customer_email === "penguji@contoh.test", String(db?.customer_email));
  const pel = await query(`SELECT email FROM customers WHERE phone = ?`, [BAKU]);
  cek("email tersimpan di pelanggan", pel[0]?.email === "penguji@contoh.test", String(pel[0]?.email));
  cek("alamat lengkap tersimpan", db?.address === "Jl. Uji Integrasi No. 1", String(db?.address));

  // Email boleh kosong, tapi kalau diisi harus berbentuk email.
  try {
    await simpanPesanan({
      items: [{ slug: produk[0].slug, qty: 1 }], nama: "X", telepon: TEL,
      email: "bukan-email", alamat: "y", tujuan,
      kurirKode: dipilih.code, kurirLayanan: dipilih.service,
    });
    cek("email tidak valid ditolak", false, "justru tersimpan");
  } catch (e) {
    cek("email tidak valid ditolak", true, e.message.slice(0, 40));
  }

  const tanpaEmail = await simpanPesanan({
    items: [{ slug: produk[0].slug, qty: 1 }], nama: "Penguji Integrasi", telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1", tujuan,
    kurirKode: dipilih.code, kurirLayanan: dipilih.service,
  });
  const pel2 = await query(`SELECT email FROM customers WHERE phone = ?`, [BAKU]);
  cek("pesanan tanpa email tetap boleh", Boolean(tanpaEmail.orderNumber));
  cek("email lama tidak terhapus oleh pesanan tanpa email", pel2[0]?.email === "penguji@contoh.test", String(pel2[0]?.email));

  /* ── Program gratis ongkir, diuji lewat tarif sungguhan ────────── */
  // Ambang dibuat mustahil tercapai: ongkirnya harus ditagih penuh.
  await simpanPengaturan("gratisOngkir", {
    aktif: true, minBelanja: 99_000_000, maksPotongan: 0, pesan: "",
  });
  const penuh = await simpanPesanan({
    items: [{ slug: produk[0].slug, qty: 1 }], nama: "Penguji Integrasi", telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1", tujuan,
    kurirKode: dipilih.code, kurirLayanan: dipilih.service,
  });
  const tarifSatu = await hitungOngkir(tujuan, Number(produk[0].weight_gram));
  const ongkirSatu = tarifSatu.find((t) => t.code === dipilih.code && t.service === dipilih.service)?.cost;
  cek("belum capai ambang: ongkir ditagih penuh", penuh.shippingCost === ongkirSatu,
    `${penuh.shippingCost} vs ${ongkirSatu}`);

  // Ambang 0 berarti semua pesanan gratis ongkir.
  await simpanPengaturan("gratisOngkir", { aktif: true, minBelanja: 0, maksPotongan: 0, pesan: "" });
  const gratis = await simpanPesanan({
    items: [{ slug: produk[0].slug, qty: 1 }], nama: "Penguji Integrasi", telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1", tujuan,
    kurirKode: dipilih.code, kurirLayanan: dipilih.service,
  });
  cek("capai ambang: ongkir jadi 0", gratis.shippingCost === 0, String(gratis.shippingCost));
  cek("total ikut turun sebesar ongkirnya", gratis.total === gratis.subtotal);

  // Batas potongan: toko hanya menanggung sebagian.
  const batas = Math.max(1000, Math.floor((ongkirSatu ?? 10000) / 2));
  await simpanPengaturan("gratisOngkir", { aktif: true, minBelanja: 0, maksPotongan: batas, pesan: "" });
  const sebagian = await simpanPesanan({
    items: [{ slug: produk[0].slug, qty: 1 }], nama: "Penguji Integrasi", telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1", tujuan,
    kurirKode: dipilih.code, kurirLayanan: dipilih.service,
  });
  cek("batas potongan: pembeli bayar selisihnya",
    sebagian.shippingCost === Math.max(0, (ongkirSatu ?? 0) - batas),
    `${sebagian.shippingCost} = ${ongkirSatu} - ${batas}`);

  // Program dimatikan: ongkir penuh lagi, walau ambangnya 0.
  await simpanPengaturan("gratisOngkir", { aktif: false, minBelanja: 0, maksPotongan: 0, pesan: "" });
  const mati = await simpanPesanan({
    items: [{ slug: produk[0].slug, qty: 1 }], nama: "Penguji Integrasi", telepon: TEL,
    alamat: "Jl. Uji Integrasi No. 1", tujuan,
    kurirKode: dipilih.code, kurirLayanan: dipilih.service,
  });
  cek("program mati: ongkir penuh lagi", mati.shippingCost === ongkirSatu,
    `${mati.shippingCost} vs ${ongkirSatu}`);

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
  await simpanPengaturan("gratisOngkir", setAwal.gratisOngkir);
  const dipulihkan = await getPengaturan();
  cek("pengaturan gratis ongkir dikembalikan",
    JSON.stringify(dipulihkan.gratisOngkir) === JSON.stringify(setAwal.gratisOngkir),
    JSON.stringify(dipulihkan.gratisOngkir));
  await bersihkan();
  const sisa = await query(`SELECT id FROM orders WHERE customer_phone = ?`, [BAKU]);
  cek("data uji terhapus bersih", sisa.length === 0);
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
