/**
 * Uji lapisan Paket dan prospek WhatsApp.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/paket-lead-test.mjs
 *
 * Menulis ke basis data sungguhan lalu menghapus seluruh jejaknya, termasuk
 * bila ada langkah yang gagal di tengah. Data ujinya memakai awalan
 * "uji-otomatis-" dan nomor 62899999… supaya mudah dikenali kalau ada yang
 * tertinggal.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { simpanPaket, hapusPaket, getPaket, getIsiPaket, listCalonIsi, listStatusKategori, setKategoriAktif } =
  await import("../src/lib/admin/packages.ts");
const { simpanLead, listLeads, ubahStatusLead, hitungLead, getLeadsPelanggan } =
  await import("../src/lib/leads.ts");
const { getCategories, getProducts, getIsiPaketToko } = await import("../src/lib/catalog.ts");
const { query, execute, pool } = await import("../src/lib/db.ts");

let gagal = 0;
const cek = (n, ok, d = "") => {
  if (!ok) gagal++;
  console.log(`  ${ok ? "OK   " : "GAGAL"} ${n}${d ? "  → " + d : ""}`);
};

const SLUG = "uji-otomatis-paket";
const SLUG2 = "uji-otomatis-paket-terpesan";
const TEL = "0899999" + String(Date.now()).slice(-6);
const BAKU = "62" + TEL.slice(1);

async function bersihkan() {
  for (const s of [SLUG, SLUG2]) {
    const [p] = await query(`SELECT id FROM products WHERE slug = ?`, [s]);
    if (!p) continue;
    await execute(`DELETE FROM order_items WHERE product_id = ?`, [p.id]);
    await execute(`DELETE FROM package_items WHERE package_id = ?`, [p.id]);
    await execute(`DELETE FROM products WHERE id = ?`, [p.id]);
  }
  await execute(`DELETE FROM orders WHERE order_number LIKE 'UJI-PAKET-%'`);
  await execute(`DELETE FROM wa_leads WHERE phone = ?`, [BAKU]);
  await execute(`DELETE FROM customers WHERE phone = ?`, [BAKU]);
}

// Status awal kategori dicatat supaya bisa dikembalikan persis, apa pun
// yang terjadi di tengah uji.
let paketAktifAwal = true;

try {
  await bersihkan();
  paketAktifAwal = (await listStatusKategori()).find((k) => k.slug === "paket")?.isActive ?? true;

  /* ── Paket ─────────────────────────────────────────────────────── */
  const calon = await listCalonIsi();
  cek("ada produk yang bisa dijadikan isi", calon.length > 0, `${calon.length} produk`);
  cek(
    "paket tidak boleh jadi isi paket lain",
    calon.every((c) => !c.name.toLowerCase().startsWith("paket ")),
  );

  const a = calon[0];
  const b = calon[1];
  const beratHarapan = a.weightGram * 2 + b.weightGram;

  const id = await simpanPaket(null, {
    slug: SLUG,
    name: "Uji Otomatis Paket",
    price: 12345,
    description: "Dibuat oleh skrip uji.",
    inStock: true,
    isActive: true,
    weightGram: 999999, // sengaja ngawur: harus diabaikan karena ada isinya
    isi: [
      { productId: a.id, qty: 2 },
      { productId: b.id, qty: 1 },
    ],
  });
  cek("paket tersimpan", Number.isInteger(id) && id > 0, `id ${id}`);

  const paket = await getPaket(id);
  cek("berat dihitung dari isi, bukan dari kolom berat", paket?.weightGram === beratHarapan,
    `${paket?.weightGram} vs ${beratHarapan}`);
  cek("harga TIDAK dihitung dari isi", paket?.price === 12345, String(paket?.price));
  cek("nilai satuan isi dihitung", paket?.hargaSatuan === a.price * 2 + b.price,
    String(paket?.hargaSatuan));

  const isi = await getIsiPaket(id);
  cek("dua jenis isi tersimpan", isi.length === 2);
  cek("jumlah per isi tersimpan", isi.find((i) => i.productId === a.id)?.qty === 2);

  // Menyimpan ulang harus menulis ulang isinya, bukan menumpuk.
  await simpanPaket(id, {
    slug: SLUG,
    name: "Uji Otomatis Paket",
    price: 12345,
    description: "Dibuat oleh skrip uji.",
    inStock: true,
    isActive: true,
    weightGram: 0,
    isi: [{ productId: a.id, qty: 3 }],
  });
  const isi2 = await getIsiPaket(id);
  cek("isi ditulis ulang, tidak menumpuk", isi2.length === 1 && isi2[0].qty === 3,
    `${isi2.length} baris`);
  cek("berat ikut dihitung ulang", (await getPaket(id))?.weightGram === a.weightGram * 3);

  // Paket tanpa isi wajib punya berat.
  try {
    await simpanPaket(null, {
      slug: SLUG2, name: "x", price: 1000, description: "", inStock: true, isActive: true,
      weightGram: 0, isi: [],
    });
    cek("paket tanpa isi dan tanpa berat ditolak", false, "justru tersimpan");
  } catch (e) {
    cek("paket tanpa isi dan tanpa berat ditolak", true, e.message.slice(0, 40));
  }

  /* ── Nyala/mati kategori ───────────────────────────────────────── */
  await setKategoriAktif("paket", true);
  cek("paket tampil di toko saat kategori nyala",
    (await getProducts()).some((p) => p.slug === SLUG));
  cek("kategori paket ada di daftar kategori toko",
    (await getCategories()).some((c) => c.slug === "paket"));
  cek("isi paket terbaca dari sisi toko", (await getIsiPaketToko(SLUG)).length === 1);

  await setKategoriAktif("paket", false);
  cek("paket hilang dari toko saat kategori mati",
    !(await getProducts()).some((p) => p.slug === SLUG));
  cek("kategori paket hilang dari daftar kategori toko",
    !(await getCategories()).some((c) => c.slug === "paket"));
  cek("produk kategori lain TIDAK ikut hilang",
    (await getProducts()).some((p) => p.category === "makanan"));

  await setKategoriAktif("paket", true);

  /* ── Hapus vs arsipkan ─────────────────────────────────────────── */
  const idTerpesan = await simpanPaket(null, {
    slug: SLUG2, name: "Uji Otomatis Paket Terpesan", price: 5000,
    description: "", inStock: true, isActive: true, weightGram: 500, isi: [],
  });
  const { insertId: idPesanan } = await execute(
    `INSERT INTO orders (order_number, customer_name, customer_phone, subtotal, shipping_cost, total, weight_gram)
     VALUES (?, 'Uji', ?, 5000, 0, 5000, 500)`,
    [`UJI-PAKET-${Date.now()}`, BAKU],
  );
  await execute(
    `INSERT INTO order_items (order_id, product_id, name, qty, unit_price, weight_gram)
     VALUES (?, ?, 'Uji Otomatis Paket Terpesan', 1, 5000, 500)`,
    [idPesanan, idTerpesan],
  );

  cek("paket yang pernah dipesan diarsipkan, bukan dihapus",
    (await hapusPaket(idTerpesan)) === "diarsipkan");
  const sesudah = await getPaket(idTerpesan);
  cek("barisnya masih ada dan tidak aktif", sesudah !== undefined && sesudah.isActive === false);

  cek("paket yang belum pernah dipesan benar-benar dihapus",
    (await hapusPaket(id)) === "dihapus");
  cek("barisnya hilang", (await getPaket(id)) === undefined);
  cek("isinya ikut terhapus lewat CASCADE",
    (await query(`SELECT id FROM package_items WHERE package_id = ?`, [id])).length === 0);

  /* ── Prospek WhatsApp ──────────────────────────────────────────── */
  const idLead = await simpanLead({
    nama: "Penguji Otomatis",
    telepon: TEL,
    email: "uji@contoh.test",
    pesan: "Halo, ini uji otomatis.",
    sumber: "produk",
    produkSlug: "dodol-betawi",
    halaman: "/produk/dodol-betawi",
  });
  cek("prospek tersimpan", Number.isInteger(idLead) && idLead > 0);

  const lead = (await listLeads({ q: BAKU }))[0];
  cek("nomor dinormalkan ke 62…", lead?.phone === BAKU, String(lead?.phone));
  cek("sumber tersimpan", lead?.source === "produk", String(lead?.source));
  cek("slug produk tersimpan", lead?.productSlug === "dodol-betawi");
  cek("status awal 'baru'", lead?.status === "baru");

  const pel = await query(`SELECT id, name, email FROM customers WHERE phone = ?`, [BAKU]);
  cek("pelanggan ikut dibuat dari prospek", pel.length === 1, String(pel[0]?.name));
  cek("prospek tertaut ke pelanggan", lead?.customerId === pel[0]?.id);
  cek("prospek terbaca dari sisi pelanggan",
    (await getLeadsPelanggan(pel[0].id)).length === 1);

  cek("ubah status berhasil", (await ubahStatusLead(idLead, "prospek", "catatan uji")) === 1);
  cek("status tersimpan", (await listLeads({ q: BAKU }))[0]?.status === "prospek");
  cek("saringan status bekerja",
    (await listLeads({ q: BAKU, status: "batal" })).length === 0);

  const h = await hitungLead();
  cek("hitungan prospek masuk akal", h.total >= 1 && h.mingguIni >= 1,
    `total ${h.total}, minggu ini ${h.mingguIni}`);

  // Validasi masukan.
  for (const [nama, masuk] of [
    ["nama kosong ditolak", { nama: "", telepon: TEL }],
    // Namanya sengaja sah, kalau tidak yang tertolak justru namanya dan
    // pemeriksaan nomornya tidak pernah benar-benar dijalankan.
    ["nomor terlalu pendek ditolak", { nama: "Penguji Otomatis", telepon: "0812" }],
    ["email ngawur ditolak", { nama: "Penguji Otomatis", telepon: TEL, email: "bukan-email" }],
  ]) {
    try {
      await simpanLead(masuk);
      cek(nama, false, "justru tersimpan");
    } catch (e) {
      cek(nama, true, e.message.slice(0, 40));
    }
  }

  const asing = await simpanLead({ nama: "Penguji Otomatis", telepon: TEL, sumber: "peretas" });
  const leadAsing = (await listLeads({ q: BAKU }))[0];
  cek("sumber asing dipaksa jadi 'lain'", leadAsing?.source === "lain", String(leadAsing?.source));
  void asing;
} catch (e) {
  gagal++;
  console.log("  GAGAL uji terhenti:", e.message);
} finally {
  await setKategoriAktif("paket", paketAktifAwal);
  await bersihkan();
  const sisa = await query(
    `SELECT slug FROM products WHERE slug IN (?, ?)
     UNION ALL SELECT phone FROM wa_leads WHERE phone = ?`,
    [SLUG, SLUG2, BAKU],
  );
  cek("data uji terhapus bersih", sisa.length === 0, `${sisa.length} baris tersisa`);
  cek(
    "status kategori paket dikembalikan",
    ((await listStatusKategori()).find((k) => k.slug === "paket")?.isActive ?? true) === paketAktifAwal,
  );
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
