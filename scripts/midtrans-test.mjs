/**
 * Uji lapisan Midtrans TANPA membuat transaksi apa pun.
 *
 *   node --import ./scripts/ts-resolver.mjs scripts/midtrans-test.mjs
 *
 * Dua hal yang diuji:
 *   1. Verifikasi tanda tangan notifikasi — murni perhitungan, tidak
 *      menyentuh jaringan. Ini penjaga paling penting: tanpanya siapa pun
 *      bisa menandai pesanan sebagai lunas.
 *   2. Pemetaan transaction_status Midtrans ke status pesanan kita.
 *
 * Kredensial produksi sengaja TIDAK dipakai membuat transaksi. Pemeriksaan
 * auth memakai endpoint baca-saja pada order yang tidak ada.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.resolve(import.meta.dirname, "..");
for (const b of fs.readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  if (!b || b.trimStart().startsWith("#") || !b.includes("=")) continue;
  const i = b.indexOf("=");
  process.env[b.slice(0, i).trim()] ??= b.slice(i + 1).trim();
}

const { tandaTanganSah, petakanStatus, midtransAktif, midtransProduksi } = await import(
  "../src/lib/midtrans.ts"
);

let gagal = 0;
const cek = (nama, lulus, detail = "") => {
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "OK   " : "GAGAL"} ${nama}${detail ? "  → " + detail : ""}`);
};

const SERVER = process.env.MIDTRANS_SERVER_KEY;
console.log(`Midtrans aktif: ${midtransAktif()} | mode produksi: ${midtransProduksi()}\n`);

/* ── 1. Tanda tangan ──────────────────────────────────────────────── */
const buatTanda = (orderId, statusCode, gross, kunci = SERVER) =>
  createHash("sha512").update(orderId + statusCode + gross + kunci).digest("hex");

const sah = {
  order_id: "RML-260901-ABCDE",
  status_code: "200",
  gross_amount: "93000.00",
  transaction_status: "settlement",
  signature_key: buatTanda("RML-260901-ABCDE", "200", "93000.00"),
};

cek("tanda tangan sah diterima", tandaTanganSah(sah) === true);
cek("tanda tangan huruf besar tetap diterima", tandaTanganSah({ ...sah, signature_key: sah.signature_key.toUpperCase() }) === true);
cek("tanda tangan dari server key lain DITOLAK", tandaTanganSah({ ...sah, signature_key: buatTanda(sah.order_id, "200", "93000.00", "kunci-palsu") }) === false);
cek("nomor pesanan diubah DITOLAK", tandaTanganSah({ ...sah, order_id: "RML-260901-ZZZZZ" }) === false);
cek("jumlah diubah DITOLAK", tandaTanganSah({ ...sah, gross_amount: "1000.00" }) === false);
cek("status_code diubah DITOLAK", tandaTanganSah({ ...sah, status_code: "201" }) === false);
cek("tanpa tanda tangan DITOLAK", tandaTanganSah({ ...sah, signature_key: undefined }) === false);
cek("notifikasi kosong DITOLAK", tandaTanganSah({}) === false);

/* ── 2. Pemetaan status ───────────────────────────────────────────── */
const peta = [
  [{ transaction_status: "settlement" }, "dibayar"],
  [{ transaction_status: "capture", fraud_status: "accept" }, "dibayar"],
  [{ transaction_status: "capture", fraud_status: "challenge" }, "menunggu_bayar"],
  [{ transaction_status: "pending" }, "menunggu_bayar"],
  [{ transaction_status: "deny" }, "dibatalkan"],
  [{ transaction_status: "cancel" }, "dibatalkan"],
  [{ transaction_status: "expire" }, "kedaluwarsa"],
  [{ transaction_status: "refund" }, "dikembalikan"],
  [{ transaction_status: "partial_refund" }, "dikembalikan"],
  [{ transaction_status: "entah_apa" }, null],
];
for (const [n, diharapkan] of peta) {
  const hasil = petakanStatus(n);
  cek(
    `${String(n.transaction_status).padEnd(15)}${n.fraud_status ? "/" + n.fraud_status : ""} → ${diharapkan}`,
    hasil === diharapkan,
    hasil === diharapkan ? "" : `dapat ${hasil}`,
  );
}

/* ── 3. Auth, baca-saja ───────────────────────────────────────────── */
const auth = "Basic " + Buffer.from(SERVER + ":").toString("base64");
const base = midtransProduksi() ? "https://api.midtrans.com" : "https://api.sandbox.midtrans.com";
try {
  const r = await fetch(`${base}/v2/CEK-AUTH-${Date.now()}/status`, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const j = await r.json();
  // 404 di badan jawaban berarti auth diterima dan transaksinya memang tidak ada.
  cek(
    `kredensial diterima di ${midtransProduksi() ? "PRODUKSI" : "sandbox"}`,
    r.status !== 401 && j.status_code === "404",
    `HTTP ${r.status}, status_code ${j.status_code}`,
  );
} catch (e) {
  cek("pemeriksaan auth", false, e.message);
}

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
