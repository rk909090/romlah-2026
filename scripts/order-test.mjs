/**
 * Uji penyimpanan pesanan terhadap basis data sungguhan.
 *
 *   node scripts/order-test.mjs
 *
 * Memakai nomor telepon uji berawalan 62899999 dan MENGHAPUS seluruh jejaknya
 * di akhir, sehingga aman dijalankan pada basis data yang sedang dipakai.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

for (const baris of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!baris || baris.trimStart().startsWith("#") || !baris.includes("=")) continue;
  const i = baris.indexOf("=");
  process.env[baris.slice(0, i).trim()] ??= baris.slice(i + 1).trim();
}

// Uji ini memeriksa logika pesanan, bukan penyedia ongkir. Kredensial
// Biteship sengaja dilepas agar lapisan ongkir memakai tarif contoh:
// kalau tidak, kegagalan di pihak Biteship (saldo habis, jaringan putus)
// akan tampak seperti kegagalan penyimpanan pesanan.
delete process.env.BITESHIP_API_KEY;
delete process.env.BITESHIP_ORIGIN_AREA_ID;

// Impor dinamis: db.ts membangun kolam koneksi saat modul dimuat, jadi env
// harus sudah terisi lebih dulu.
const { simpanPesanan, getPesananByNomor, getBarisPesanan } = await import("../src/lib/orders.ts");
const { query, execute, pool } = await import("../src/lib/db.ts");
const { GRATIS_ONGKIR_MIN } = await import("../src/data/site.ts");

const TELEPON_UJI = "0899999" + String(Date.now()).slice(-6);
let gagal = 0;
const cek = (nama, lulus, detail = "") => {
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "OK   " : "GAGAL"} ${nama}${detail ? "  → " + detail : ""}`);
};

// Bentuk area Biteship: ID berupa string, hanya sampai tingkat kecamatan.
const TUJUAN = {
  id: "IDNP6IDNC148IDND840IDZ12730",
  label: "Mampang Prapatan, Jakarta Selatan, DKI Jakarta. 12730",
  district: "Mampang Prapatan",
  city: "Jakarta Selatan",
  province: "DKI Jakarta",
  postalCode: "12730",
};

// Ambil dua produk sungguhan beserta harga resminya.
const produk = await query(
  `SELECT slug, name, price, weight_gram FROM products
    WHERE is_active = 1 AND in_stock = 1 ORDER BY id LIMIT 2`,
);
if (produk.length < 2) {
  console.error("Butuh minimal 2 produk aktif untuk menguji.");
  process.exit(1);
}
const [p1, p2] = produk;
console.log(`Produk uji: ${p1.name} (${p1.price}) dan ${p2.name} (${p2.price})\n`);

const nomorTersimpan = [];

/* ── 1. Pesanan yang sah ──────────────────────────────────────────── */
const hasil = await simpanPesanan({
  items: [
    { slug: p1.slug, qty: 2 },
    { slug: p2.slug, qty: 1 },
  ],
  nama: "Penguji Otomatis",
  telepon: TELEPON_UJI,
  email: "penguji@contoh.test",
  alamat: "Jl. Uji Coba No. 1",
  tujuan: TUJUAN,
  kurirKode: "jne",
  kurirLayanan: "REG",
});
nomorTersimpan.push(hasil.orderNumber);

const subtotalBenar = Number(p1.price) * 2 + Number(p2.price);
const beratBenar = Number(p1.weight_gram) * 2 + Number(p2.weight_gram);

cek("nomor pesanan berformat RML-YYMMDD-XXXXX", /^RML-\d{6}-[23456789A-Z]{5}$/.test(hasil.orderNumber), hasil.orderNumber);
cek("subtotal dihitung dari harga basis data", hasil.subtotal === subtotalBenar, `${hasil.subtotal} vs ${subtotalBenar}`);
cek("berat dihitung dari basis data", hasil.weightGram === beratBenar, `${hasil.weightGram} g`);
cek("total = subtotal + ongkir", hasil.total === hasil.subtotal + hasil.shippingCost);

const gratisSeharusnya = subtotalBenar >= GRATIS_ONGKIR_MIN;
cek(
  `ambang gratis ongkir diterapkan server (subtotal ${subtotalBenar} vs ${GRATIS_ONGKIR_MIN})`,
  gratisSeharusnya ? hasil.shippingCost === 0 : hasil.shippingCost > 0,
  `ongkir ${hasil.shippingCost}`,
);

/* ── 2. Benar-benar tersimpan ─────────────────────────────────────── */
const tersimpan = await getPesananByNomor(hasil.orderNumber);
cek("pesanan ada di tabel orders", Boolean(tersimpan));
cek("status awal menunggu_konfirmasi", tersimpan?.status === "menunggu_konfirmasi");
cek("kanal tercatat whatsapp", tersimpan?.channel === "whatsapp");
cek("total di basis data sama dengan yang dikembalikan", Number(tersimpan?.total) === hasil.total);

const baris = await getBarisPesanan(tersimpan.id);
cek("dua baris barang tersimpan", baris.length === 2, `${baris.length} baris`);
cek(
  "harga satuan DISALIN ke baris, bukan dirujuk",
  baris.every((b) => Number(b.unit_price) > 0),
);

/* ── 3. Pelanggan terbentuk & nomor dinormalkan ───────────────────── */
const bakuDiharapkan = "62" + TELEPON_UJI.slice(1);
const pelanggan = await query(`SELECT id, phone, name FROM customers WHERE phone = ?`, [bakuDiharapkan]);
cek("pelanggan dibuat dengan nomor ternormalkan", pelanggan.length === 1, bakuDiharapkan);
cek("pesanan tertaut ke pelanggan", Number(tersimpan?.customer_id) === pelanggan[0]?.id);

const alamat = await query(`SELECT id FROM customer_addresses WHERE customer_id = ?`, [pelanggan[0].id]);
cek("alamat tersimpan", alamat.length === 1);

/* ── 4. Format nomor lain menunjuk pelanggan yang sama ────────────── */
const h2 = await simpanPesanan({
  items: [{ slug: p1.slug, qty: 1 }],
  nama: "Penguji Otomatis",
  telepon: "+62" + TELEPON_UJI.slice(1), // format berbeda, orang yang sama
  email: "penguji@contoh.test",
  alamat: "Jl. Uji Coba No. 1",
  tujuan: TUJUAN,
  kurirKode: "jne",
  kurirLayanan: "REG",
});
nomorTersimpan.push(h2.orderNumber);

const pelangganLagi = await query(`SELECT id FROM customers WHERE phone = ?`, [bakuDiharapkan]);
cek("format nomor berbeda tidak membuat pelanggan kedua", pelangganLagi.length === 1);
const alamatLagi = await query(`SELECT id FROM customer_addresses WHERE customer_id = ?`, [pelanggan[0].id]);
cek("alamat identik tidak digandakan", alamatLagi.length === 1, `${alamatLagi.length} alamat`);
cek("nomor pesanan kedua berbeda", h2.orderNumber !== hasil.orderNumber);

/* ── 5. Masukan tidak sah ditolak ─────────────────────────────────── */
async function harusGagal(nama, masukan) {
  try {
    const r = await simpanPesanan(masukan);
    nomorTersimpan.push(r.orderNumber);
    cek(nama, false, "justru tersimpan");
  } catch (e) {
    cek(nama, true, e.message.slice(0, 52));
  }
}

const dasar = {
  items: [{ slug: p1.slug, qty: 1 }],
  nama: "Penguji Otomatis",
  telepon: TELEPON_UJI,
  email: "penguji@contoh.test",
  alamat: "Jl. Uji Coba No. 1",
  tujuan: TUJUAN,
  kurirKode: "jne",
  kurirLayanan: "REG",
};

await harusGagal("kurir palsu ditolak", { ...dasar, kurirKode: "kurir-hantu", kurirLayanan: "X" });
await harusGagal("layanan palsu ditolak", { ...dasar, kurirLayanan: "SUPER-MURAH" });
await harusGagal("nama kosong ditolak", { ...dasar, nama: "   " });
await harusGagal("nomor telepon pendek ditolak", { ...dasar, telepon: "0812" });
await harusGagal("keranjang kosong ditolak", { ...dasar, items: [] });
await harusGagal("produk tidak dikenal ditolak", { ...dasar, items: [{ slug: "produk-tidak-ada", qty: 1 }] });
await harusGagal("jumlah nol ditolak", { ...dasar, items: [{ slug: p1.slug, qty: 0 }] });
await harusGagal("jumlah negatif ditolak", { ...dasar, items: [{ slug: p1.slug, qty: -5 }] });
await harusGagal("kirim tanpa tujuan ditolak", { ...dasar, tujuan: null });
// Email jadi WAJIB sejak bukti transaksi dikirim lewat surel.
await harusGagal("email kosong ditolak", { ...dasar, email: "" });
await harusGagal("email tanpa @ ditolak", { ...dasar, email: "bukan-email" });

/* ── 6. Ambil di toko tidak butuh tujuan dan gratis ───────────────── */
const h3 = await simpanPesanan({ ...dasar, tujuan: null, kurirKode: "pickup", kurirLayanan: "Tanjung Barat" });
nomorTersimpan.push(h3.orderNumber);
cek("ambil di toko: ongkir nol", h3.shippingCost === 0);
cek("ambil di toko: tanpa tujuan pun tersimpan", Boolean(await getPesananByNomor(h3.orderNumber)));

/* ── 7. Bersihkan ─────────────────────────────────────────────────── */
for (const n of nomorTersimpan) {
  const o = await query(`SELECT id FROM orders WHERE order_number = ?`, [n]);
  if (o[0]) await execute(`DELETE FROM orders WHERE id = ?`, [o[0].id]); // order_items ikut lewat CASCADE
}
await execute(`DELETE FROM customers WHERE phone = ?`, [bakuDiharapkan]);

const sisaPesanan = await query(`SELECT id FROM orders WHERE customer_phone = ?`, [bakuDiharapkan]);
const sisaPelanggan = await query(`SELECT id FROM customers WHERE phone = ?`, [bakuDiharapkan]);
cek("data uji terhapus bersih", sisaPesanan.length === 0 && sisaPelanggan.length === 0);

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
await pool.end();
process.exit(gagal === 0 ? 0 : 1);
