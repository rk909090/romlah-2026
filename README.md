# romlah-web

Bangun ulang romlah.com dengan Next.js. Toko dan panel admin sudah berjalan di
atas MariaDB. Pembayaran Midtrans dan ongkir RajaOngkir menunggu API key.

## Menjalankan

```bash
pnpm install
pnpm dev        # http://localhost:3311
pnpm build      # produksi
```

## Yang sudah jadi

| Rute | Isi |
| --- | --- |
| `/` | Beranda: hero, chip kategori, produk unggulan, paket, alasan, outlet |
| `/katalog` | 39 produk, penyaring kategori/harga/stok + pengurutan, semuanya lewat URL |
| `/produk/[slug]` | Galeri, harga, berat, deskripsi, beli, JSON-LD `Product` |
| `/keranjang` | Keranjang, alamat, ongkir, dua jalur checkout |
| `/toko` | Alamat & jam buka tiga outlet |
| `/api/ongkir/*` | Pencarian tujuan & hitung tarif (di server) |
| `/admin/*` | Panel admin — lihat bagian tersendiri di bawah |

Halaman toko **dirender saat permintaan**, bukan dibangun statis. Katalog kini
berasal dari MariaDB, dan build di Hostinger belum tentu memegang kredensial
basis data; pramuat statis akan membuat seluruh build gagal hanya karena tahap
itu. Kalau nanti kredensial dipastikan tersedia saat build, halaman produk bisa
dikembalikan ke SSG untuk mempercepatnya.

## Basis data

MariaDB 11.8 di Hostinger. Skema ada di `src/db/schema.sql` — sembilan tabel:
`admin_users`, `admin_sessions`, `categories`, `products`, `product_images`,
`customers`, `customer_addresses`, `orders`, `order_items`.

**Pelanggan dikunci nomor telepon, bukan email.** Pembeli lewat WhatsApp datang
membawa nomor; tanpa itu pesanan dari WhatsApp dan dari website tidak akan
pernah bisa disatukan jadi satu riwayat. Nomor dinormalkan ke bentuk `62…`
lewat `normalkanTelepon()` sehingga `0812…`, `+62812…`, dan `62812…` tidak
tercatat sebagai tiga orang berbeda.

Sebagian pernyataan `ALTER TABLE … IF NOT EXISTS` di akhir skema adalah
perluasan MariaDB, bukan MySQL. Perhatikan juga letak `IF NOT EXISTS` untuk
kunci asing: ia diletakkan **sesudah** `FOREIGN KEY`, bukan sesudah
`ADD CONSTRAINT`.

Variabel lingkungan yang wajib ada (lihat `.env.example`): `DATABASE_HOST`,
`DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`.
Untuk produksi, setel di panel Hostinger. **Jangan** menaruh nilainya di berkas
yang ikut ter-commit — `.env*` diabaikan git, kecuali `.env.example`.

```bash
node scripts/db-setup.mjs       # terapkan skema + isi 39 produk (aman diulang)
node scripts/db-smoke-test.mjs  # jalankan setiap kueri aplikasi terhadap DB
node scripts/password-test.mjs  # uji hash & verifikasi kata sandi
node --import ./scripts/ts-resolver.mjs scripts/order-test.mjs     # uji simpan pesanan
node --import ./scripts/ts-resolver.mjs scripts/midtrans-test.mjs # uji tanda tangan & pemetaan status
node scripts/rajaongkir-origin.mjs                                # cari ID outlet asal
```

`midtrans-test.mjs` sengaja TIDAK membuat transaksi apa pun. Pemeriksaan
kredensial memakai endpoint baca-saja pada nomor pesanan yang tidak ada.

`order-test.mjs` menyimpan pesanan sungguhan memakai nomor uji `62899999…`
lalu menghapus seluruh jejaknya, jadi aman dijalankan pada basis data yang
sedang dipakai. `ts-resolver.mjs` hanya alat uji: Node ESM tidak mengenal alias
`@/` dan menuntut ekstensi eksplisit, sedangkan kode aplikasi memakai keduanya.

**Kuota Hostinger untuk akun basis data ini: 500 koneksi per jam, maksimum 100
koneksi bersamaan, statement maksimum 180 detik.** Karena itu `src/lib/db.ts`
memakai satu kolam koneksi kecil (limit 5) yang disimpan di `globalThis` — tanpa
itu, hot reload akan meninggalkan kolam yatim dan menghabiskan kuota.

Tanpa ORM, dengan sengaja. `drizzle-kit` bergantung pada esbuild dan Prisma
mengunduh engine, keduanya lewat skrip pascapasang — persis jenis masalah yang
sudah beberapa kali menggagalkan build di Hostinger. Kueri ditulis sebagai SQL
berparameter; tipe parameternya dipersempit lewat `SqlParam`.

## Alur pesanan WhatsApp

Tombol **Pesan lewat WhatsApp** di keranjang memanggil server action
`buatPesanan`, yang menyimpan pesanan ke basis data lebih dulu, baru menyusun
pesan WhatsApp dari angka yang sudah tersimpan. Dengan urutan itu, isi pesan
dan isi basis data mustahil berbeda.

**Server tidak pernah mempercayai angka dari browser.** Klien hanya mengirim
pilihan — produk mana, kurir mana. Harga, berat, ongkir, dan ambang gratis
ongkir seluruhnya dihitung ulang di `src/lib/orders.ts` dari basis data dan
dari penyedia ongkir. Nama dan harga barang **disalin** ke `order_items`, jadi
kenaikan harga bulan depan tidak mengubah nota lama.

Pelanggan ter-`upsert` berdasarkan nomor telepon yang dinormalkan, dan seluruh
penulisan (pelanggan, alamat, pesanan, baris pesanan) berjalan dalam satu
transaksi — pesanan tanpa barang lebih buruk daripada pesanan yang gagal.

Nomor pesanan berformat `RML-YYMMDD-XXXXX` dengan lima karakter acak, bukan
urut. Halaman status `/pesanan/[nomor]` bisa dibuka tanpa login supaya pembeli
tidak perlu membuat akun; kalau nomornya urut, siapa pun bisa menebak nomor
tetangganya dan membaca alamat orang lain.

Keranjang dikosongkan begitu pesanan tersimpan, dan layar konfirmasi bersifat
final — tanpa itu, menekan kembali lalu memesan lagi akan membuat pesanan
kedua yang sama.

## Panel admin

Ada di `/admin`, memakai layout terpisah dari toko lewat grup rute `(toko)` dan
`admin/(panel)` — panel tidak mewarisi header, footer, maupun keranjang toko.

| Rute | Isi |
| --- | --- |
| `/admin/setup` | Membuat admin pertama. Menutup diri begitu ada satu admin |
| `/admin/login` | Masuk |
| `/admin` | Dasbor: produk aktif, stok habis, produk tanpa foto |
| `/admin/produk` | Daftar, cari, tapis kategori/status, arsipkan |
| `/admin/produk/baru`, `/admin/produk/[id]` | Buat dan ubah produk |
| `/admin/pesanan`, `/admin/pesanan/[id]` | Daftar & detail pesanan, ubah status dan nomor resi |
| `/admin/pelanggan` | Daftar pelanggan, dikunci nomor WhatsApp |
| `/admin/pengaturan` | Ganti kata sandi, lihat sesi aktif |

Beberapa keputusan keamanan:

- **Kata sandi admin pertama tidak pernah lewat berkas atau skrip.** Dibuat
  lewat `/admin/setup`, yang menolak jalan begitu satu admin sudah ada — dijaga
  di server action juga, bukan sekadar disembunyikan halamannya.
- **scrypt bawaan Node**, bukan bcrypt, agar tidak ada binding native.
  Parameternya ikut disimpan di dalam hash sehingga bisa dinaikkan kelak.
- **Token sesi disimpan sebagai hash SHA-256**, bukan nilai aslinya. Isi tabel
  yang bocor tidak cukup untuk membajak sesi.
- Pesan galat saat masuk sama untuk email tak dikenal maupun sandi salah, dan
  ada pembatas 5 percobaan gagal per email selama 10 menit.
- Produk **diarsipkan, tidak dihapus** — baris pesanan menunjuk ke produk lewat
  foreign key.

## Data

`src/data/products.json` — hasil migrasi dari WooCommerce lama lewat Store API
publik, sekarang dipakai sebagai sumber seed untuk basis data. 39 produk, 66
foto di `public/produk/`. Foto duplikat yang ada di situs lama sudah disaring.

**Satu koreksi data:** `Sagon Bakar Romlah` (legacyId 31526) tercatat beratnya
`300` kg di WooCommerce — hampir pasti salah entri untuk 300 gram. Nilai itu
ditimpa di `scripts/extract.py` lewat `WEIGHT_OVERRIDE_G` dan **perlu
dikonfirmasi pemilik**. Tanpa koreksi ini, ongkir untuk produk tersebut mustahil.

## Yang masih tiruan

Ditandai jelas di kode dan di layar, bukan disembunyikan:

- **Ongkir** (`src/lib/shipping.ts`) — bentuk data sudah persis RajaOngkir V2
  (Komerce), tapi isinya masih data contoh. Di layar muncul peringatan "Tarif
  contoh". Yang perlu diganti hanya isi `cariTujuan()` dan `hitungOngkir()`;
  pemanggilannya sudah lewat route handler supaya API key tidak bocor ke browser.
- **Pembayaran** — tombol "Bayar sekarang" sengaja dinonaktifkan sampai kunci
  Midtrans ada.
- **Pembayaran** — hanya itu yang tersisa. Status `dibayar` masih ditandai
  manual di panel setelah transfer masuk; nanti webhook Midtrans yang
  menandainya.
- **Testimoni** (`TESTIMONIALS` di `src/data/site.ts`) — sengaja kosong.
  Bagiannya tidak dirender selama larik itu kosong. Tidak diisi kutipan karangan.

## Lapisan data

Halaman tidak pernah menyentuh basis data langsung. Baca katalog lewat
`src/lib/catalog.ts`, tulis dari admin lewat `src/lib/admin/products.ts`.
Pemisahan itu terbukti berguna: pindah dari JSON ke MariaDB hanya mengubah isi
`catalog.ts`, tanpa menyentuh satu pun komponen.

Keranjang ada di `localStorage` lewat `useSyncExternalStore`
(`src/components/cart-provider.tsx`), tersinkron antar tab.

## Deploy ke Hostinger

Lingkungan build Hostinger (terbaca dari API mereka, bukan diasumsikan):
Node 22, tipe aplikasi `next`, keluaran `.next`, sumber `git`, dan package
manager **tidak diset** sehingga dideteksi otomatis dari lockfile — jatuh ke
pnpm, yang dijalankan lewat **corepack dengan pnpm 11.25.0**.

Tiga hal yang membuat build pertama gagal, dan cara mengatasinya:

1. **Pin versi pnpm.** Scaffolder menulis `"packageManager": "pnpm@10.33.2"`
   mengikuti pnpm mesin pengembang. Di bawah corepack, pnpm menolak berpindah
   versi, jadi pin itu bentrok dengan pnpm 11.25.0 milik Hostinger dan
   instalasi berhenti. Field itu **dibuang** — tanpa pin, pnpm versi apa pun
   yang dipakai host tidak akan pernah bentrok lagi. Jangan tambahkan kembali.

2. **Kebijakan `minimumReleaseAge`.** pnpm 11 menolak paket yang baru terbit
   sebagai perlindungan rantai pasok, dan lockfile lama memuat beberapa paket
   semacam itu. Lockfile dibuat ulang memakai pnpm 11 dengan kebijakan tetap
   **aktif**, sehingga resolusinya sendiri sudah lolos. Daftar
   `minimumReleaseAgeExclude` di `pnpm-workspace.yaml` dibuat otomatis oleh
   pnpm untuk paket Next.js yang versinya dipatok persis.

3. **Skrip pascapasang dependensi.** pnpm 11 keluar dengan kode 1 bila ada
   dependensi berskrip pascapasang yang belum ditinjau. Keputusannya dicatat
   eksplisit lewat `allowBuilds` di `pnpm-workspace.yaml`.

   Perhatikan: pnpm 11 **menghapus** `onlyBuiltDependencies`,
   `neverBuiltDependencies`, dan `ignoredBuiltDependencies`, menggantinya
   dengan `allowBuilds`. Kunci lama tidak memicu galat — ia diabaikan
   diam-diam, jadi instalasi tetap gagal tanpa petunjuk apa pun. Kalau kelak
   error `ERR_PNPM_IGNORED_BUILDS` muncul lagi untuk paket baru, tambahkan
   paket itu ke `allowBuilds` dengan `true` atau `false`, jangan pakai kunci
   lama.

Lockfile tetap `lockfileVersion: 9.0` — format itu dibaca pnpm 11 tanpa
masalah; kegagalannya dulu murni soal kebijakan, bukan format.

## Belum dibuat

`/cerita`, `/reseller`, `/blog` — menunggu keputusan pemilik soal nasib 15
artikel lama (2017–2018) dan apakah program reseller masih berjalan.
