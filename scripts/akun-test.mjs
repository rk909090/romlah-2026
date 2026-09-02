/**
 * Uji akun pelanggan: kata sandi, bukti kepemilikan, dan sesi.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/akun-test.mjs
 *
 * Menulis ke basis data sungguhan lalu menghapus seluruh jejaknya, termasuk
 * bila ada langkah yang gagal di tengah. Nomor ujinya berawalan 62899999.
 *
 * Fungsi yang menyentuh cookie (buatSesiPelanggan, getPelangganSaatIni) tidak
 * bisa dipanggil di luar permintaan Next, jadi yang diuji di sini adalah
 * lapisan di bawahnya: periksaMasuk dan aturSandiDenganPesanan — tempat
 * seluruh keputusan keamanannya benar-benar diambil.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

// Diimpor dari akun-data, bukan akun: yang terakhir memakai `next/headers`
// yang hanya ada di dalam permintaan Next.
const { periksaMasuk, aturSandiDenganPesanan, punyaSandi, getPesananPelanggan, getRingkasanPelanggan } =
  await import("../src/lib/akun-data.ts");
const { normalkanTelepon, teleponSah, saringAngka, tampilkanTelepon } =
  await import("../src/lib/telepon.ts");
const { query, execute, pool } = await import("../src/lib/db.ts");

let gagal = 0;
const cek = (n, ok, d = "") => {
  if (!ok) gagal++;
  console.log(`  ${ok ? "OK   " : "GAGAL"} ${n}${d ? "  → " + d : ""}`);
};
const sama = (n, a, b) => cek(n, a === b, `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

const A = "62899999" + String(Date.now()).slice(-6);
const B = "62899998" + String(Date.now()).slice(-6);
const NOMOR_A = "RML-UJIAKUN-A" + String(Date.now()).slice(-4);
const NOMOR_B = "RML-UJIAKUN-B" + String(Date.now()).slice(-4);
const SANDI = "sandi-uji-yang-panjang";

async function bersihkan() {
  for (const t of [A, B]) {
    await execute(`DELETE FROM orders WHERE customer_phone = ?`, [t]);
    await execute(`DELETE FROM customers WHERE phone = ?`, [t]);
  }
}

console.log("── Pembakuan nomor ──");

sama("nol depan jadi 62", normalkanTelepon("081234567890"), "6281234567890");
sama("plus dan spasi dibuang", normalkanTelepon("+62 812-3456-7890"), "6281234567890");
sama("tanpa nol depan tetap dikenali", normalkanTelepon("81234567890"), "6281234567890");
sama("huruf disaring habis", saringAngka("08a1b2c3+-. 456"), "0812345 6".replace(/\D/g, ""));
sama("panjang dibatasi", saringAngka("0812345678901234567890").length, 15);
cek("nomor yang wajar dianggap sah", teleponSah("081234567890") === true);
cek("nomor terlalu pendek ditolak", teleponSah("0812") === false);
cek("bukan angka ditolak", teleponSah("abcdefghij") === false);
sama("tampilan berkelompok", tampilkanTelepon("6281234567890"), "+62 812-3456-7890");

console.log("\n── Kata sandi dan bukti kepemilikan ──");

try {
  await bersihkan();

  // Dua pelanggan, masing-masing satu pesanan.
  for (const [tel, nomor, nama] of [[A, NOMOR_A, "Penguji A"], [B, NOMOR_B, "Penguji B"]]) {
    await execute(`INSERT INTO customers (phone, name, email) VALUES (?, ?, ?)`, [
      tel, nama, `${nama.replace(/\s/g, "").toLowerCase()}@contoh.test`,
    ]);
    const [c] = await query(`SELECT id FROM customers WHERE phone = ?`, [tel]);
    await execute(
      `INSERT INTO orders (order_number, customer_id, customer_name, customer_phone,
                           subtotal, shipping_cost, total, weight_gram, status)
       VALUES (?, ?, ?, ?, 100000, 10000, 110000, 500, 'selesai')`,
      [nomor, c.id, nama, tel],
    );
  }

  cek("akun baru belum punya sandi", (await punyaSandi(A)) === false);

  const belum = await periksaMasuk(A, "apa saja");
  cek("masuk sebelum sandi dibuat ditolak dengan alasan khusus",
    belum.ok === false && belum.alasan === "belum-punya-sandi", JSON.stringify(belum));

  // Nomor pesanan MILIK ORANG LAIN tidak boleh menolong.
  const curi = await aturSandiDenganPesanan(A, NOMOR_B, SANDI);
  cek("nomor pesanan orang lain ditolak", curi.ok === false,
    curi.ok ? "" : curi.alasan.slice(0, 50));
  cek("sandi tetap belum ada setelah percobaan itu", (await punyaSandi(A)) === false);

  const ngawur = await aturSandiDenganPesanan(A, "RML-260101-XXXXX", SANDI);
  cek("nomor pesanan ngawur ditolak", ngawur.ok === false);

  // Nomor pesanan sendiri: lolos.
  const set = await aturSandiDenganPesanan(A, NOMOR_A, SANDI);
  cek("nomor pesanan sendiri diterima", set.ok === true,
    set.ok ? set.pelanggan.name : set.alasan);
  cek("sandi tercatat", (await punyaSandi(A)) === true);

  // Huruf kecil pada nomor pesanan tetap dikenali.
  cek("nomor pesanan huruf kecil tetap diterima",
    (await aturSandiDenganPesanan(A, NOMOR_A.toLowerCase(), SANDI)).ok === true);

  const masuk = await periksaMasuk(A, SANDI);
  cek("masuk dengan sandi benar", masuk.ok === true);
  cek("masuk dengan sandi salah ditolak", (await periksaMasuk(A, "salah-total")).ok === false);
  sama("sandi salah dan nomor tak dikenal memberi alasan yang sama",
    (await periksaMasuk(A, "salah-total")).alasan,
    (await periksaMasuk("628999990000000", "apa pun")).alasan);

  // Format nomor lain menunjuk akun yang sama.
  cek("format 0… menunjuk akun yang sama",
    (await periksaMasuk("0" + A.slice(2), SANDI)).ok === true);

  // Sandi tersimpan sebagai hash, bukan teks polos.
  const [c] = await query(`SELECT password_hash FROM customers WHERE phone = ?`, [A]);
  cek("sandi disimpan sebagai hash scrypt",
    typeof c.password_hash === "string" && c.password_hash.startsWith("scrypt$") &&
      !c.password_hash.includes(SANDI),
    c.password_hash?.slice(0, 20));

  // Mengganti sandi memutus seluruh sesi lama.
  const [ca] = await query(`SELECT id FROM customers WHERE phone = ?`, [A]);
  await execute(
    `INSERT INTO customer_sessions (token_hash, customer_id, expires_at)
     VALUES (REPEAT('a', 64), ?, NOW() + INTERVAL 1 DAY)`,
    [ca.id],
  );
  cek("sesi contoh terpasang",
    (await query(`SELECT token_hash FROM customer_sessions WHERE customer_id = ?`, [ca.id])).length === 1);
  await aturSandiDenganPesanan(A, NOMOR_A, "sandi-yang-baru-sekali");
  cek("ganti sandi memutus seluruh sesi lama",
    (await query(`SELECT token_hash FROM customer_sessions WHERE customer_id = ?`, [ca.id])).length === 0);
  cek("sandi lama tidak berlaku lagi", (await periksaMasuk(A, SANDI)).ok === false);
  cek("sandi baru berlaku", (await periksaMasuk(A, "sandi-yang-baru-sekali")).ok === true);

  // Riwayat hanya milik sendiri.
  const riwayatA = await getPesananPelanggan(ca.id);
  cek("riwayat berisi pesanan sendiri", riwayatA.length === 1 && riwayatA[0].order_number === NOMOR_A,
    riwayatA.map((r) => r.order_number).join(","));
  cek("riwayat tidak memuat pesanan orang lain",
    !riwayatA.some((r) => r.order_number === NOMOR_B));

  const ringkas = await getRingkasanPelanggan(ca.id);
  sama("ringkasan menghitung satu pesanan", ringkas.pesanan, 1);
  sama("ringkasan menghitung nilainya", ringkas.belanja, 110000);

  // Pesanan batal tidak dihitung sebagai belanja.
  await execute(`UPDATE orders SET status = 'dibatalkan' WHERE order_number = ?`, [NOMOR_A]);
  sama("pesanan batal tidak masuk total belanja",
    (await getRingkasanPelanggan(ca.id)).belanja, 0);
  sama("tapi tetap terhitung sebagai pesanan",
    (await getRingkasanPelanggan(ca.id)).pesanan, 1);
} catch (e) {
  gagal++;
  console.log("  GAGAL uji terhenti:", e.message);
} finally {
  await bersihkan();
  const sisa = await query(`SELECT id FROM customers WHERE phone IN (?, ?)`, [A, B]);
  const sisaPesanan = await query(`SELECT id FROM orders WHERE order_number IN (?, ?)`, [NOMOR_A, NOMOR_B]);
  cek("data uji terhapus bersih", sisa.length === 0 && sisaPesanan.length === 0,
    `${sisa.length} pelanggan, ${sisaPesanan.length} pesanan`);
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
