/**
 * Uji rentang tanggal (WIB→UTC) dan aturan program pemasaran.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/rentang-promo-test.mjs
 *
 * Bagian rentang murni hitungan, tanpa basis data. Bagian pengaturan menulis
 * ke basis data sungguhan lalu MENGEMBALIKAN nilai semula, apa pun yang
 * terjadi di tengah.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { bacaRentang, hariIniWIB, geserHari, syaratRentang } =
  await import("../src/lib/admin/rentang.ts");
const { ongkirSetelahProgram, memenuhiGratisOngkir, kurangGratisOngkir, BAWAAN } =
  await import("../src/lib/promo.ts");

let gagal = 0;
const cek = (n, ok, d = "") => {
  if (!ok) gagal++;
  console.log(`  ${ok ? "OK   " : "GAGAL"} ${n}${d ? "  → " + d : ""}`);
};
const sama = (n, a, b) => cek(n, a === b, `${JSON.stringify(a)} vs ${JSON.stringify(b)}`);

console.log("── Rentang tanggal ──");

// 2 September 2026, 03.00 UTC = 2 September 10.00 WIB — hari yang sama.
sama("hariIniWIB pada siang UTC", hariIniWIB(new Date("2026-09-02T03:00:00Z")), "2026-09-02");

// 1 September 20.00 UTC = 2 September 03.00 WIB — HARI BERIKUTNYA di Jakarta.
// Inilah yang salah kalau tanggalnya dihitung apa adanya dari UTC.
sama("hariIniWIB pada malam UTC sudah besok di WIB",
  hariIniWIB(new Date("2026-09-01T20:00:00Z")), "2026-09-02");

// 2 September 00.00 UTC = 2 September 07.00 WIB — masih hari yang sama.
sama("hariIniWIB pada tengah malam UTC", hariIniWIB(new Date("2026-09-02T00:00:00Z")), "2026-09-02");

sama("geserHari maju", geserHari("2026-09-30", 1), "2026-10-01");
sama("geserHari mundur lintas tahun", geserHari("2026-01-01", -1), "2025-12-31");

const kini = new Date("2026-09-02T03:00:00Z"); // 2 Sep 10.00 WIB

{
  const r = bacaRentang({ rentang: "hari-ini" }, kini);
  // 2 Sep 00.00 WIB = 1 Sep 17.00 UTC; batas atas 3 Sep 00.00 WIB = 2 Sep 17.00 UTC.
  sama("hari-ini mulai", r.mulaiUtc, "2026-09-01 17:00:00");
  sama("hari-ini sebelum (eksklusif)", r.sebelumUtc, "2026-09-02 17:00:00");
  cek("hari-ini ditandai aktif", r.aktif === true);
}

{
  // Pesanan jam 06.00 WIB tersimpan sebagai 23.00 UTC hari sebelumnya.
  // Harus tetap masuk saringan "hari ini".
  const r = bacaRentang({ rentang: "hari-ini" }, kini);
  const pesananPagi = "2026-09-01 23:30:00"; // = 2 Sep 06.30 WIB
  cek("pesanan pagi WIB ikut terjaring hari ini",
    pesananPagi >= r.mulaiUtc && pesananPagi < r.sebelumUtc, pesananPagi);

  // Sedangkan pesanan 1 Sep 23.00 WIB (= 1 Sep 16.00 UTC) TIDAK boleh ikut.
  const pesananKemarinMalam = "2026-09-01 16:00:00";
  cek("pesanan kemarin malam WIB tidak ikut",
    !(pesananKemarinMalam >= r.mulaiUtc), pesananKemarinMalam);
}

{
  const r = bacaRentang({ rentang: "kemarin" }, kini);
  sama("kemarin dari", r.dari, "2026-09-01");
  sama("kemarin sampai", r.sampai, "2026-09-01");
}

{
  const r = bacaRentang({ rentang: "7hari" }, kini);
  sama("7 hari termasuk hari ini", r.dari, "2026-08-27");
  sama("7 hari berakhir hari ini", r.sampai, "2026-09-02");
}

{
  const r = bacaRentang({ rentang: "30hari" }, kini);
  sama("30 hari mundur 29 hari", r.dari, "2026-08-04");
}

{
  const r = bacaRentang({ rentang: "bulan-ini" }, kini);
  sama("bulan ini mulai tanggal 1", r.dari, "2026-09-01");
  sama("bulan ini sampai hari ini", r.sampai, "2026-09-02");
}

{
  const r = bacaRentang({ rentang: "bulan-lalu" }, kini);
  sama("bulan lalu mulai", r.dari, "2026-08-01");
  sama("bulan lalu berakhir di hari terakhirnya", r.sampai, "2026-08-31");
}

{
  const r = bacaRentang({ dari: "2026-09-05", sampai: "2026-09-01" }, kini);
  sama("tanggal terbalik ditukar (dari)", r.dari, "2026-09-01");
  sama("tanggal terbalik ditukar (sampai)", r.sampai, "2026-09-05");
}

{
  const r = bacaRentang({ dari: "bukan-tanggal", sampai: "2026-13-45" }, kini);
  cek("tanggal ngawur diabaikan", r.aktif === false && r.label === "Semua waktu");
}

{
  // Bentuknya benar tapi tanggalnya tidak ada. Sebelum diperbaiki, ini
  // MELEMPAR RangeError dan menjatuhkan seluruh halaman admin.
  for (const t of ["2026-13-45", "2026-02-31", "2026-00-10", "0000-00-00"]) {
    const r = bacaRentang({ dari: t }, kini);
    cek(`tanggal mustahil ${t} ditolak tanpa melempar`, r.aktif === false);
  }
  cek("tanggal kabisat yang sah tetap diterima",
    bacaRentang({ dari: "2028-02-29" }, kini).dari === "2028-02-29");
  cek("29 Februari tahun bukan kabisat ditolak",
    bacaRentang({ dari: "2026-02-29" }, kini).aktif === false);
}

{
  const r = bacaRentang({ rentang: "peretas", dari: "2026-09-01" }, kini);
  cek("kunci rentang asing diabaikan, dari tetap dipakai", r.rentang === undefined && r.dari === "2026-09-01");
}

{
  const r = bacaRentang({ rentang: "hari-ini", dari: "2020-01-01" }, kini);
  cek("chip cepat menang atas dari/sampai", r.dari === "2026-09-02", String(r.dari));
}

{
  const r = bacaRentang({}, kini);
  cek("tanpa parameter = tanpa batas", !r.mulaiUtc && !r.sebelumUtc && !r.aktif);
  const s = syaratRentang(r, "created_at");
  cek("tanpa batas menghasilkan SQL kosong", s.sql === "" && s.nilai.length === 0);
}

{
  const r = bacaRentang({ dari: "2026-09-01" }, kini);
  const s = syaratRentang(r, "o.created_at");
  sama("hanya batas bawah", s.sql, "o.created_at >= ?");
  cek("satu nilai terikat", s.nilai.length === 1, s.nilai[0]);
}

{
  const s = syaratRentang(bacaRentang({ rentang: "7hari" }, kini), "created_at");
  cek("dua batas menghasilkan dua tanda tanya",
    s.sql === "created_at >= ? AND created_at < ?" && s.nilai.length === 2);
}

console.log("\n── Program gratis ongkir ──");

const g = (p) => ({ ...BAWAAN.gratisOngkir, ...p });

sama("program mati: ongkir penuh",
  ongkirSetelahProgram(15000, 999999, g({ aktif: false })), 15000);
sama("belum mencapai minimal: ongkir penuh",
  ongkirSetelahProgram(15000, 100000, g({ minBelanja: 250000 })), 15000);
sama("mencapai minimal tanpa batas: gratis",
  ongkirSetelahProgram(15000, 250000, g({ minBelanja: 250000, maksPotongan: 0 })), 0);
sama("tepat di ambang sudah dihitung gratis",
  ongkirSetelahProgram(15000, 250000, g({ minBelanja: 250000 })), 0);
sama("batas potongan: pembeli bayar selisih",
  ongkirSetelahProgram(50000, 300000, g({ minBelanja: 250000, maksPotongan: 20000 })), 30000);
sama("batas potongan lebih besar dari ongkir: gratis",
  ongkirSetelahProgram(15000, 300000, g({ minBelanja: 250000, maksPotongan: 20000 })), 0);
sama("ambil di toko selalu 0 walau program mati",
  ongkirSetelahProgram(15000, 0, g({ aktif: false }), true), 0);
sama("minimal 0 berarti semua gratis",
  ongkirSetelahProgram(15000, 0, g({ minBelanja: 0 })), 0);

cek("memenuhi: di bawah ambang", memenuhiGratisOngkir(100000, g({ minBelanja: 250000 })) === false);
cek("memenuhi: di ambang", memenuhiGratisOngkir(250000, g({ minBelanja: 250000 })) === true);
cek("memenuhi: program mati selalu false",
  memenuhiGratisOngkir(999999, g({ aktif: false })) === false);
sama("kurang: sisa menuju ambang", kurangGratisOngkir(100000, g({ minBelanja: 250000 })), 150000);
sama("kurang: sudah lewat ambang", kurangGratisOngkir(300000, g({ minBelanja: 250000 })), 0);
sama("kurang: program mati", kurangGratisOngkir(0, g({ aktif: false })), 0);

console.log("\n── Penyimpanan pengaturan ──");

const { getPengaturan, simpanPengaturan } = await import("../src/lib/settings.ts");
const { execute, query, pool } = await import("../src/lib/db.ts");

const getPengaturanAwal = getPengaturan;

// Nilai semula disalin supaya bisa dikembalikan persis.
const semula = await query(`SELECT setting_key, value FROM settings`);
// Pengaturan yang BERLAKU sebelum uji. Dipakai sebagai pembanding, bukan
// BAWAAN: basis data sungguhan boleh saja sudah punya pengaturan tersimpan,
// dan uji yang mengandaikan semuanya masih bawaan akan gagal palsu.
const berlakuSemula = await getPengaturanAwal();

try {
  await simpanPengaturan("gratisOngkir", {
    aktif: false, minBelanja: 123456, maksPotongan: 7890, pesan: "uji otomatis",
  });
  // getPengaturan dibungkus cache() React, yang di luar permintaan Next
  // tidak menyimpan apa pun — jadi pembacaan ini benar-benar dari basis data.
  const a = await getPengaturan();
  cek("gratis ongkir tersimpan utuh",
    a.gratisOngkir.aktif === false && a.gratisOngkir.minBelanja === 123456 &&
    a.gratisOngkir.maksPotongan === 7890 && a.gratisOngkir.pesan === "uji otomatis",
    JSON.stringify(a.gratisOngkir));
  cek("bidang lain tidak ikut berubah",
    a.checkout.tombolWa === berlakuSemula.checkout.tombolWa,
    `${a.checkout.tombolWa} vs ${berlakuSemula.checkout.tombolWa}`);

  await simpanPengaturan("checkout", { tombolWa: false });
  cek("checkout tersimpan", (await getPengaturan()).checkout.tombolWa === false);

  // Baris rusak harus jatuh ke bawaan, bukan menjatuhkan seluruh pengaturan.
  await execute(`UPDATE settings SET value = ? WHERE setting_key = 'banner'`, ["{bukan json"]);
  await execute(
    `INSERT INTO settings (setting_key, value) VALUES ('banner', '{bukan json')
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
  );
  const b = await getPengaturan();
  cek("JSON rusak jatuh ke bawaan", b.banner.aktif === BAWAAN.banner.aktif && b.banner.teks === "");
  cek("bidang lain tidak ikut rusak", b.gratisOngkir.minBelanja === 123456);

  // Tipe yang salah per bidang juga diabaikan, bukan diterima mentah-mentah.
  await execute(
    `INSERT INTO settings (setting_key, value) VALUES ('checkout', '{"tombolWa":"iya"}')
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
  );
  // Nilai bertipe salah harus jatuh ke BAWAAN — di sini pembandingnya memang
  // BAWAAN, karena barisnya sengaja dirusak sehingga isinya diabaikan.
  cek("nilai bertipe salah diabaikan",
    (await getPengaturan()).checkout.tombolWa === BAWAAN.checkout.tombolWa);

  await execute(
    `INSERT INTO settings (setting_key, value) VALUES ('kunci_asing', '{"x":1}')
     ON DUPLICATE KEY UPDATE value = VALUES(value)`,
  );
  cek("kunci tak dikenal tidak mengganggu", (await getPengaturan()).gratisOngkir.minBelanja === 123456);
} catch (e) {
  gagal++;
  console.log("  GAGAL uji terhenti:", e.message);
} finally {
  await execute(`DELETE FROM settings`);
  for (const s of semula) {
    await execute(`INSERT INTO settings (setting_key, value) VALUES (?, ?)`, [s.setting_key, s.value]);
  }
  const sesudah = await query(`SELECT setting_key, value FROM settings ORDER BY setting_key`);
  const urut = (a) => [...a].sort((x, y) => x.setting_key.localeCompare(y.setting_key))
    .map((r) => `${r.setting_key}=${r.value}`).join("|");
  cek("pengaturan dikembalikan persis seperti semula", urut(semula) === urut(sesudah),
    `${semula.length} baris`);
  await pool.end();
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
