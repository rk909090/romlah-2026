/**
 * Uji fungsi kata sandi terhadap kode yang sungguh dipakai aplikasi.
 *
 *   node scripts/password-test.mjs
 *
 * Mengimpor src/lib/password.ts langsung — Node 23+ melucuti tipe TypeScript
 * sendiri, jadi tidak perlu langkah kompilasi. Modul itu sengaja tidak
 * mengimpor apa pun dari Next supaya bisa diuji seperti ini.
 */
import { hashPassword, verifyPassword } from "../src/lib/password.ts";

let gagal = 0;
const cek = (nama, hasil, diharapkan) => {
  const lulus = hasil === diharapkan;
  if (!lulus) gagal++;
  console.log(`  ${lulus ? "OK   " : "GAGAL"} ${nama}`);
};

const sandi = "kata sandi yang panjang 123";
const hash = await hashPassword(sandi);

console.log("format hash:", hash.slice(0, 24) + "…");
cek("berformat scrypt$N$r$p$salt$hash", hash.split("$").length === 6 && hash.startsWith("scrypt$"), true);
cek("kata sandi asli tidak tersimpan", hash.includes(sandi), false);

cek("sandi benar diterima", await verifyPassword(sandi, hash), true);
cek("sandi salah ditolak", await verifyPassword(sandi + "x", hash), false);
cek("sandi kosong ditolak", await verifyPassword("", hash), false);
cek("beda huruf besar ditolak", await verifyPassword(sandi.toUpperCase(), hash), false);

// Dua hash dari sandi sama harus berbeda — salt-nya acak.
const hash2 = await hashPassword(sandi);
cek("salt acak (dua hash berbeda)", hash === hash2, false);
cek("hash kedua tetap sah", await verifyPassword(sandi, hash2), true);

// Masukan rusak tidak boleh melempar, cukup dianggap salah.
for (const rusak of ["", "bukan-hash", "scrypt$1$2$3", "scrypt$16384$8$1$$", "bcrypt$a$b$c$d$e"]) {
  cek(`masukan rusak ditolak: ${JSON.stringify(rusak).slice(0, 28)}`, await verifyPassword(sandi, rusak), false);
}

// Normalisasi Unicode: bentuk terurai dan tergabung harus dianggap sama.
const hashAksen = await hashPassword("kopí susu manis");
cek("normalisasi NFKC konsisten", await verifyPassword("kopí susu manis", hashAksen), true);

console.log(gagal === 0 ? "\nSemua uji lolos." : `\n${gagal} uji gagal.`);
process.exit(gagal === 0 ? 0 : 1);
