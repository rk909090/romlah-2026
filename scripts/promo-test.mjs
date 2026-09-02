/**
 * Uji kode promo: hitungan murni, pemeriksaan, dan penebusan kuota.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/promo-test.mjs
 *
 * Menulis ke basis data sungguhan lalu menghapus seluruh jejaknya, termasuk
 * bila ada langkah yang gagal di tengah. Kodenya berawalan UJI-OTOMATIS-
 * supaya mudah dikenali kalau ada yang tertinggal.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { hitungPromo, normalkanKode, ringkasPromo } = await import("../src/lib/promo-kode.ts");
const { simpanPromoKode, getPromoByCode, periksaPromo, tebusPromo, hapusPromoKode } =
  await import("../src/lib/admin/promo.ts");
const { query, execute, transaksi, pool } = await import("../src/lib/db.ts");

let gagal = 0;
const cek = (n, ok, d = "") => {
  if (!ok) gagal++;
  console.log(`  ${ok ? "OK   " : "GAGAL"} ${n}${d ? "  → " + d : ""}`);
};
const sama = (n, a, b) => cek(n, a === b, `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

const AWALAN = "UJI-OTOMATIS-";
const TEL = "62899999" + String(Date.now()).slice(-6);

async function bersihkan() {
  await execute(`DELETE FROM orders WHERE customer_phone = ?`, [TEL]);
  await execute(`DELETE FROM promo_codes WHERE code LIKE ?`, [AWALAN + "%"]);
  await execute(`DELETE FROM customers WHERE phone = ?`, [TEL]);
}

console.log("── Hitungan murni ──");

const p = (o) => ({ code: "X", jenis: "nominal", nilai: 0, minBelanja: 0, maksPotongan: 0, ...o });

sama("normalkan kode: huruf besar tanpa spasi", normalkanKode("  lebaran 25 "), "LEBARAN25");

sama("nominal: potongan rupiah",
  hitungPromo(p({ jenis: "nominal", nilai: 25000 }), 100000, 10000).diskonBarang, 25000);
sama("nominal tidak melebihi belanja",
  hitungPromo(p({ jenis: "nominal", nilai: 500000 }), 100000, 10000).diskonBarang, 100000);
sama("belum capai minimal: tidak ada potongan",
  hitungPromo(p({ jenis: "nominal", nilai: 25000, minBelanja: 200000 }), 100000, 10000).total, 0);
sama("tepat di ambang minimal sudah dapat",
  hitungPromo(p({ jenis: "nominal", nilai: 25000, minBelanja: 100000 }), 100000, 10000).total, 25000);

sama("persen: 10% dari 200.000",
  hitungPromo(p({ jenis: "persen", nilai: 10 }), 200000, 10000).diskonBarang, 20000);
sama("persen dibatasi maks potongan",
  hitungPromo(p({ jenis: "persen", nilai: 50, maksPotongan: 30000 }), 200000, 10000).diskonBarang, 30000);
sama("persen dibulatkan, bukan dipotong",
  hitungPromo(p({ jenis: "persen", nilai: 15 }), 33333, 0).diskonBarang, Math.round(33333 * 0.15));

sama("ongkir: potong sebesar nilainya",
  hitungPromo(p({ jenis: "ongkir", nilai: 8000 }), 100000, 20000).diskonOngkir, 8000);
sama("ongkir tidak melebihi ongkirnya",
  hitungPromo(p({ jenis: "ongkir", nilai: 50000 }), 100000, 12000).diskonOngkir, 12000);
sama("ongkir nilai 0 = seluruh ongkir",
  hitungPromo(p({ jenis: "ongkir", nilai: 0 }), 100000, 17000).diskonOngkir, 17000);
sama("ongkir 0 tetap dibatasi maks potongan",
  hitungPromo(p({ jenis: "ongkir", nilai: 0, maksPotongan: 10000 }), 100000, 17000).diskonOngkir, 10000);
sama("ongkir tidak menyentuh harga barang",
  hitungPromo(p({ jenis: "ongkir", nilai: 8000 }), 100000, 20000).diskonBarang, 0);
sama("ongkir sudah gratis: tidak ada yang bisa dipotong",
  hitungPromo(p({ jenis: "ongkir", nilai: 8000 }), 100000, 0).total, 0);

cek("ringkasan persen menyebut batasnya",
  ringkasPromo(p({ jenis: "persen", nilai: 10, maksPotongan: 20000 })).includes("maks"),
  ringkasPromo(p({ jenis: "persen", nilai: 10, maksPotongan: 20000 })));

console.log("\n── Pemeriksaan dan penebusan ──");

try {
  await bersihkan();

  /* Kode biasa */
  const idBiasa = await simpanPromoKode(null, {
    code: AWALAN + "BIASA", description: "uji", jenis: "nominal", nilai: 20000,
    minBelanja: 100000, maksPotongan: 0, kuota: null, kuotaPerOrang: null,
    mulai: null, berakhir: null, isActive: true,
  });
  cek("kode tersimpan", Number.isInteger(idBiasa) && idBiasa > 0);

  cek("kode huruf kecil tetap dikenali",
    (await getPromoByCode(AWALAN.toLowerCase() + "biasa"))?.id === idBiasa);

  const lolos = await periksaPromo(AWALAN + "BIASA", 150000, 10000);
  cek("lolos di atas minimal", lolos.ok === true && lolos.hasil.total === 20000,
    JSON.stringify(lolos.ok ? lolos.hasil : lolos.alasan));

  const kurang = await periksaPromo(AWALAN + "BIASA", 50000, 10000);
  cek("ditolak di bawah minimal", kurang.ok === false,
    kurang.ok ? "" : kurang.alasan);

  cek("kode tidak dikenal ditolak",
    (await periksaPromo("KODE-YANG-TIDAK-ADA", 999999, 0)).ok === false);

  /* Nonaktif */
  await execute(`UPDATE promo_codes SET is_active = 0 WHERE id = ?`, [idBiasa]);
  cek("kode nonaktif ditolak", (await periksaPromo(AWALAN + "BIASA", 150000, 0)).ok === false);
  await execute(`UPDATE promo_codes SET is_active = 1 WHERE id = ?`, [idBiasa]);

  /* Masa berlaku */
  await execute(`UPDATE promo_codes SET berakhir = NOW() - INTERVAL 1 DAY WHERE id = ?`, [idBiasa]);
  cek("kode kedaluwarsa ditolak", (await periksaPromo(AWALAN + "BIASA", 150000, 0)).ok === false);
  await execute(`UPDATE promo_codes SET berakhir = NULL, mulai = NOW() + INTERVAL 1 DAY WHERE id = ?`, [idBiasa]);
  cek("kode yang belum mulai ditolak", (await periksaPromo(AWALAN + "BIASA", 150000, 0)).ok === false);
  await execute(`UPDATE promo_codes SET mulai = NULL WHERE id = ?`, [idBiasa]);

  /* Kuota */
  const idKuota = await simpanPromoKode(null, {
    code: AWALAN + "KUOTA", description: "", jenis: "nominal", nilai: 5000,
    minBelanja: 0, maksPotongan: 0, kuota: 2, kuotaPerOrang: null,
    mulai: null, berakhir: null, isActive: true,
  });

  const tebus = async () => transaksi(async (tx) => tebusPromo(tx, idKuota));
  cek("tebusan pertama berhasil", (await tebus()) === true);
  cek("tebusan kedua berhasil", (await tebus()) === true);
  cek("tebusan ketiga DITOLAK karena kuota habis", (await tebus()) === false);
  sama("pemakaian berhenti tepat di kuota",
    Number((await getPromoByCode(AWALAN + "KUOTA")).terpakai), 2);
  cek("kode berkuota habis ditolak saat diperiksa",
    (await periksaPromo(AWALAN + "KUOTA", 100000, 0)).ok === false);

  /* Penebusan bersamaan: yang mengikat adalah UPDATE bersyarat, bukan
     baca-lalu-tulis. Sepuluh transaksi serentak pada kuota 3 harus
     menghasilkan tepat 3 keberhasilan. */
  const idRebut = await simpanPromoKode(null, {
    code: AWALAN + "REBUT", description: "", jenis: "nominal", nilai: 1000,
    minBelanja: 0, maksPotongan: 0, kuota: 3, kuotaPerOrang: null,
    mulai: null, berakhir: null, isActive: true,
  });
  const hasil = await Promise.all(
    Array.from({ length: 10 }, () => transaksi(async (tx) => tebusPromo(tx, idRebut))),
  );
  sama("10 penebusan serentak pada kuota 3 → tepat 3 berhasil",
    hasil.filter(Boolean).length, 3);
  sama("terpakai tidak melebihi kuota",
    Number((await getPromoByCode(AWALAN + "REBUT")).terpakai), 3);

  /* Kuota per orang */
  const idOrang = await simpanPromoKode(null, {
    code: AWALAN + "SEKALI", description: "", jenis: "nominal", nilai: 5000,
    minBelanja: 0, maksPotongan: 0, kuota: null, kuotaPerOrang: 1,
    mulai: null, berakhir: null, isActive: true,
  });
  void idOrang;
  cek("belum pernah dipakai: lolos",
    (await periksaPromo(AWALAN + "SEKALI", 100000, 0, TEL)).ok === true);

  await execute(
    `INSERT INTO orders (order_number, customer_name, customer_phone, subtotal,
                         shipping_cost, promo_code, discount, total, weight_gram, status)
     VALUES (?, 'Uji', ?, 100000, 0, ?, 5000, 95000, 100, 'dibayar')`,
    [`UJI-PROMO-${Date.now()}`, TEL, AWALAN + "SEKALI"],
  );
  cek("sudah dipakai orang yang sama: ditolak",
    (await periksaPromo(AWALAN + "SEKALI", 100000, 0, TEL)).ok === false);
  cek("orang lain tetap boleh",
    (await periksaPromo(AWALAN + "SEKALI", 100000, 0, "628123456789")).ok === true);

  /* Hapus vs nonaktifkan */
  sama("kode yang pernah ditebus hanya dinonaktifkan",
    await hapusPromoKode(idKuota), "dinonaktifkan");
  cek("barisnya masih ada", (await getPromoByCode(AWALAN + "KUOTA")) !== undefined);

  const idBaru = await simpanPromoKode(null, {
    code: AWALAN + "BARU", description: "", jenis: "nominal", nilai: 1000,
    minBelanja: 0, maksPotongan: 0, kuota: null, kuotaPerOrang: null,
    mulai: null, berakhir: null, isActive: true,
  });
  sama("kode yang belum pernah ditebus benar-benar dihapus",
    await hapusPromoKode(idBaru), "dihapus");
  cek("barisnya hilang", (await getPromoByCode(AWALAN + "BARU")) === undefined);
} catch (e) {
  gagal++;
  console.log("  GAGAL uji terhenti:", e.message);
} finally {
  await bersihkan();
  const sisa = await query(`SELECT code FROM promo_codes WHERE code LIKE ?`, [AWALAN + "%"]);
  const sisaPesanan = await query(`SELECT id FROM orders WHERE customer_phone = ?`, [TEL]);
  cek("data uji terhapus bersih", sisa.length === 0 && sisaPesanan.length === 0,
    `${sisa.length} kode, ${sisaPesanan.length} pesanan`);
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
