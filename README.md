# romlah-web

Bangun ulang romlah.com dengan Next.js. Toko, panel admin, ongkir Biteship,
dan pembayaran Midtrans sudah berjalan di atas MariaDB.

## Menjalankan

```bash
pnpm install
pnpm dev        # http://localhost:3311
pnpm build      # produksi
```

## Yang sudah jadi

| Rute | Isi |
| --- | --- |
| `/` | Beranda: slider 16:9, hero, produk unggulan, paket, alasan, outlet |
| `/katalog` | 39 produk, penyaring kategori/harga/stok + pengurutan, semuanya lewat URL |
| `/produk/[slug]` | Galeri, harga, berat, deskripsi, beli, JSON-LD `Product` |
| `/keranjang` | Keranjang, alamat lengkap, email opsional, ongkir, dua jalur checkout |
| `/toko` | Alamat & jam buka outlet Tanjung Barat, plus toko Tokopedia |
| `/api/ongkir/*` | Pencarian tujuan & hitung tarif (di server) |
| `/api/produk` | Ringkasan produk untuk keranjang mini |
| `/admin/*` | Panel admin — lihat bagian tersendiri di bawah |

Halaman toko **dirender saat permintaan**, bukan dibangun statis. Katalog kini
berasal dari MariaDB, dan build di Hostinger belum tentu memegang kredensial
basis data; pramuat statis akan membuat seluruh build gagal hanya karena tahap
itu. Kalau nanti kredensial dipastikan tersedia saat build, halaman produk bisa
dikembalikan ke SSG untuk mempercepatnya.

## Basis data

MariaDB 11.8 di Hostinger. Skema ada di `src/db/schema.sql` — tiga belas tabel:
`admin_users`, `admin_sessions`, `categories`, `products`, `product_images`,
`customers`, `customer_addresses`, `orders`, `order_items`, `package_items`,
`wa_leads`, `settings`, `promo_codes`.

**Server basis datanya berjalan di UTC**, sedangkan tokonya di Jakarta (WIB,
UTC+7) — diperiksa langsung: `NOW()` sama persis dengan `UTC_TIMESTAMP()`.
Setiap penyaringan tanggal harus menggeser batasnya 7 jam, kalau tidak pesanan
jam 6 pagi WIB (tersimpan sebagai 23.00 UTC hari sebelumnya) jatuh ke hari yang
salah. Seluruh hitungannya terkumpul di `src/lib/admin/rentang.ts`.

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
node --import ./scripts/ts-resolver.mjs scripts/biteship-test.mjs # uji pencarian area & tarif
node --import ./scripts/ts-resolver.mjs scripts/integration-test.mjs # pesanan + tarif Biteship sungguhan
node scripts/biteship-origin.mjs 12530                            # cari ID area outlet asal
node scripts/sync-deskripsi.mjs          # bandingkan deskripsi products.json vs DB
node scripts/sync-deskripsi.mjs --tulis  # dorong deskripsi ke DB (hanya kolom description)
node --import ./scripts/ts-resolver.mjs scripts/paket-lead-test.mjs # uji paket & prospek WA
node --import ./scripts/ts-resolver.mjs scripts/rentang-promo-test.mjs # uji rentang tanggal & program
node --import ./scripts/ts-resolver.mjs scripts/promo-test.mjs # uji kode promo & kuota serentak
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
| `/admin/pelanggan/[id]` | Profil lengkap: alamat tersimpan, riwayat pesanan, inquiry WA |
| `/admin/inquiry` | Prospek dari tombol WhatsApp di toko; ubah status & catatan |
| `/admin/marketing` | Daftar program pemasaran; pilih satu untuk mengaturnya |
| `/admin/marketing/paket` | Nyalakan/matikan kategori Paket, dan kelola paket |
| `/admin/marketing/paket/baru`, `/admin/marketing/paket/[id]` | Buat, ubah, hapus paket |
| `/admin/marketing/ongkir` | Program kirim gratis: nyala/mati, minimal belanja, batas potongan |
| `/admin/marketing/checkout` | Tampilkan atau sembunyikan tombol "Pesan lewat WhatsApp" |
| `/admin/marketing/promo` | Kode promo: daftar, buat, ubah, hapus |
| `/admin/marketing/slider` | Slide 16:9 di paling atas beranda |
| `/admin/marketing/unggulan` | Pilih dan urutkan produk di baris "Sering jadi pilihan" |
| `/admin/marketing/banner` | Banner pengumuman di paling atas toko |
| `/admin/marketing/ekspor` | Unduh prospek, pelanggan, dan pesanan sebagai CSV |

Daftar di `/admin/produk`, `/admin/pesanan`, `/admin/pelanggan`, dan
`/admin/inquiry` memakai paging lewat URL (`hal` dan `per`), dengan pilihan
25/50/100/200 baris. Jumlah total selalu dihitung dengan agregat terpisah,
bukan dari baris yang kebetulan terambil — kalau tidak, angka ringkasannya
berubah-ubah mengikuti halaman yang sedang dibuka.
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
  foreign key. Paket adalah pengecualian sebagian: yang **belum pernah masuk
  pesanan** benar-benar dihapus, sisanya diarsipkan. Tombolnya berubah label
  sendiri sesuai keadaan itu.
- Tag pelacakan **tidak dipasang di halaman admin.** Judul halaman admin memuat
  nama pelanggan dan nomor pesanan; itu tidak pantas dikirim ke Google atau
  Meta. Analytics hidup di layout `(toko)` saja.

## Prospek WhatsApp

Setiap tombol WhatsApp di toko — beranda, halaman produk, `/toko`, footer, dan
halaman status pesanan — membuka formulir singkat lebih dulu (nama, nomor,
email opsional, pertanyaan), menyimpannya ke `wa_leads`, baru menawarkan
tautan ke WhatsApp. Sebelum ini seluruh pertanyaan yang masuk lewat WhatsApp
tidak meninggalkan jejak apa pun, padahal itu kanal terbesar Romlah.

Tombol **Pesan lewat WhatsApp** di keranjang sengaja TIDAK lewat jalur ini:
yang itu sudah membuat pesanan sungguhan beserta barang dan ongkirnya.

Nomornya dinormalkan dan pelanggannya di-upsert, jadi prospek dan pembeli lama
menyatu di satu baris `customers` dan terlihat bersama di
`/admin/pelanggan/[id]`.

Tautan WhatsApp dibuka lewat `<a>` yang benar-benar diklik pengunjung, bukan
`window.open` sesudah `await` — peramban memblokir jendela yang dibuka setelah
penantian asinkron.

## Program pemasaran

Semua yang bisa dinyalakan dan dimatikan dari `/admin/marketing` disimpan di
tabel `settings` sebagai kunci–nilai berisi JSON, bukan kolom tetap: program
datang dan pergi, dan menambah program baru tidak boleh berarti migrasi skema
lagi. Setiap pembacaan digabung dengan nilai bawaan di `src/lib/promo.ts`,
sehingga baris yang belum pernah ditulis — atau yang isinya rusak — tidak
pernah membuat toko berhenti.

**Kirim gratis** punya dua kriteria: minimal belanja, dan batas rupiah yang
ditanggung toko. Batas itu bukan hiasan — tanpa batas, kiriman 2 kg ke Papua
ditanggung penuh berapa pun ongkirnya. Aturannya dihitung oleh satu fungsi,
`ongkirSetelahProgram()`, yang dipanggil halaman keranjang MAUPUN penyimpan
pesanan; angka di layar karenanya tidak mungkin berbeda dari yang ditagihkan.

**Tombol checkout** menentukan apakah "Pesan lewat WhatsApp" tampil di
keranjang. Ada satu penjaga yang tidak bisa dilanggar dari panel: kalau
Midtrans belum aktif, tombol WhatsApp tetap ditampilkan apa pun isi
pengaturannya — mematikan keduanya sekaligus membuat keranjang jadi jalan
buntu tanpa satu pun cara memesan.

**Ekspor CSV** dijaga sesi admin dan memberi BOM UTF-8 supaya Excel di Windows
tidak mengacak huruf beraksen. Sel yang diawali `=`, `+`, `-`, atau `@` diberi
kutip di depan: tanpa itu Excel memperlakukannya sebagai rumus, yang membuka
jalan penyuntikan rumus lewat isian pengunjung.

## Paket

Paket adalah produk di kategori `paket` yang isinya menunjuk ke produk lain
lewat `package_items`. Dua aturan yang membedakannya:

- **Beratnya dihitung dari isi**, tidak diketik. Dihitung ulang di server saat
  menyimpan, jadi angka di formulir tidak bisa menyimpang. Berat yang salah
  langsung jadi ongkir yang salah.
- **Harganya tidak dihitung dari isi.** Potongan harga justru inti dari menjual
  paket. Formulirnya menampilkan nilai isi bila dibeli satuan supaya besaran
  potongannya kelihatan sebelum disimpan.

Kategori Paket bisa dimatikan dari `/admin/marketing`. Saat mati, seluruh
paket hilang dari katalog, beranda, menu, tab bar, dan footer — dan halaman
produknya membalas 404. Datanya utuh dan bisa dinyalakan lagi kapan saja.

## Kode promo

Aturan hitungannya di `src/lib/promo-kode.ts`, tanpa impor apa pun, sehingga
halaman keranjang bisa memakainya tanpa menyeret mysql2 ke peramban. Tiga
jenis: potongan persen, potongan rupiah, dan potongan ongkir.

**Yang dikirim peramban hanya KODE-nya.** Besaran potongan selalu dihitung
ulang di server saat pesanan disimpan; memalsukan angka di klien tidak
menghasilkan potongan apa pun. Pemeriksaan di keranjang sengaja tidak menebus
kuota — pembeli boleh mencoba beberapa kode tanpa menghabiskan jatah orang
lain.

**Kuota dijaga dengan UPDATE bersyarat di dalam transaksi pesanan**, bukan
baca-lalu-tulis:

```sql
UPDATE promo_codes SET terpakai = terpakai + 1
 WHERE id = ? AND (kuota IS NULL OR terpakai < kuota) AND …
```

Diuji dengan 10 penebusan serentak pada kuota 3; hasilnya tepat 3 yang
berhasil. Kalau kuotanya habis persis pada detik itu, seluruh transaksi
dibatalkan dan tidak ada pesanan setengah jadi yang tertinggal.

Potongan dikirim ke Midtrans sebagai satu baris `item_details` berharga
NEGATIF, karena Snap menolak transaksi bila jumlah rinciannya tidak sama
persis dengan `gross_amount`. Penjumlahannya diperiksa lebih dulu di
`buatTransaksiSnap()`, jadi ketidakcocokan muncul sebagai galat yang jelas,
bukan penolakan Midtrans yang membingungkan.

> **Belum diuji terhadap Midtrans sungguhan.** Kunci yang terpasang adalah
> kunci PRODUKSI, dan menguji baris berharga negatif berarti membuat
> transaksi dengan uang sungguhan. Uji dengan kunci sandbox, atau dengan satu
> pesanan bernilai kecil, sebelum kode promo diumumkan ke pembeli.

## Pelacakan

Tiga tag, disalin dari romlah.com yang sedang berjalan. Diperiksa langsung di
peramban terhadap situs live, bukan dikira-kira dari kode sumbernya: WordPress
memasang sebagian tag lewat JavaScript, jadi HTML mentah tidak memperlihatkan
semuanya.

| Yang dipasang | Isi |
| --- | --- |
| Google tag `GT-NNMKF9C` | meneruskan ke GA4 `G-Z1NM0E5YWZ` |
| Google Tag Manager `GTM-NDPM87HT` | di dalamnya: GA4 `G-H5827SJTLT`, Google Ads `AW-958729191`, Meta Pixel `4070720943181637` |
| Meta Pixel `391047905266240` | dipasang langsung |

Isi wadah GTM ikut terbawa sendirinya. **Jangan memasang GA4 `G-H5827SJTLT`,
Google Ads, atau pixel `4070720943181637` secara terpisah** — setiap kunjungan
akan terhitung dua kali.

Perpindahan halaman di dalam aplikasi ditangani `components/analytics-route.tsx`
untuk gtag dan Meta Pixel. Wadah GTM sengaja tidak disentuh: pemicu di dalamnya
diatur dari panel GTM, dan menambah kiriman sendiri dari sini bisa membuat
angkanya dobel.

## Data

`src/data/products.json` — hasil migrasi dari WooCommerce lama lewat Store API
publik, sekarang dipakai sebagai sumber seed untuk basis data. 39 produk, 66
foto di `public/produk/`. Foto duplikat yang ada di situs lama sudah disaring.

**Satu koreksi data:** `Sagon Bakar Romlah` (legacyId 31526) tercatat beratnya
`300` kg di WooCommerce — hampir pasti salah entri untuk 300 gram. Nilai itu
ditimpa di `scripts/extract.py` lewat `WEIGHT_OVERRIDE_G` dan **perlu
dikonfirmasi pemilik**. Tanpa koreksi ini, ongkir untuk produk tersebut mustahil.

## Ongkir — Biteship

`src/lib/shipping.ts` memanggil Biteship sungguhan, selalu dari server: API key
tidak pernah menyentuh peramban karena komponen klien lewat route handler di
`/api/ongkir/*`.

```
GET  https://api.biteship.com/v1/maps/areas?countries=ID&input=<q>&type=single
POST https://api.biteship.com/v1/rates/couriers
header: Authorization: <api key>        (mentah, tanpa "Bearer")
```

Butuh dua nilai: `BITESHIP_API_KEY` dan `BITESHIP_ORIGIN_AREA_ID`. Cari ID area
outlet dengan `node scripts/biteship-origin.mjs 12530`.

**ID area Biteship berupa STRING** (`IDNP6IDNC148IDND837IDZ12530`), bukan
angka. Kolom `destination_id` di `orders` dan `customer_addresses` karena itu
bertipe `VARCHAR(64)`.

Pencarian area paling andal memakai **kode pos**. Nama kelurahan sering meleset
karena Biteship hanya turun sampai tingkat kecamatan — tidak ada tingkat
kelurahan.

Kalau salah satu nilai belum diisi, lapisan ini memakai tarif contoh dan
halaman keranjang menampilkan peringatannya. Kalau keduanya ada, tarif SELALU
dari Biteship; kegagalan dilaporkan sebagai galat di layar, tidak pernah
diam-diam diganti angka karangan.

Berat dibulatkan ke minimal 1 kg sebelum dikirim, sesuai cara kurir menagih.

**Biaya yang ditagihkan bukan field `price` mentah**, melainkan
`shipping_fee + surcharge - discount`. Pada contoh di dokumentasi Biteship,
`price` (11000) sama dengan `shipping_fee` (9000) ditambah
`cash_on_delivery_fee` (2000), padahal toko ini tidak melayani COD. Diperiksa
terhadap tarif sungguhan: saat COD tidak diminta, `cash_on_delivery_fee`
bernilai 0 dan kedua cara menghasilkan angka yang sama persis pada seluruh
layanan. Bentuk ini dipertahankan sebagai penjaga bila kelak COD atau asuransi
diaktifkan.

**Catatan operasional:** API tarif menolak permintaan bila saldo akun Biteship
kosong (`No sufficient balance to call rates API`), bahkan pada kunci test
mode. Galat itu muncul sebelum validasi apa pun — kalau tarif tiba-tiba
berhenti muncul, periksa saldo lebih dulu.

**Menguji di Windows dengan antivirus penyadap HTTPS:** `next dev` yang
dijalankan tanpa `NODE_EXTRA_CA_CERTS` akan gagal menghubungi Biteship dengan
`UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Ini artefak mesin pengembang, bukan
masalah kode; di Linux Hostinger tidak terjadi. Jalankan `pnpm dev` dari shell
yang variabel itu sudah terisi.

## Pembayaran — Midtrans Snap

`src/lib/midtrans.ts` ditulis langsung di atas HTTP, bukan lewat pustaka
`midtrans-client`, karena yang dipakai hanya dua endpoint dan satu verifikasi
tanda tangan. Alurnya memakai `redirect_url` dari Snap, bukan `snap.js` di
peramban: satu berkas skrip lebih sedikit, dan client key tidak perlu ikut
dikirim ke halaman.

**Webhook wajib didaftarkan di dasbor Midtrans:**

```
https://<domain>/api/midtrans/notifikasi
```

Status pesanan **hanya** berubah dari webhook itu, tidak pernah dari halaman
sukses yang dibuka peramban — halaman itu bisa dipalsukan siapa saja. Setiap
notifikasi diverifikasi dengan `SHA512(order_id + status_code + gross_amount +
serverKey)`, jumlahnya dicocokkan dengan yang tersimpan, dan pesanan yang sudah
`dikirim`/`selesai` tidak bisa dimundurkan oleh notifikasi susulan.

Masa berlaku transaksi disetel 24 jam. Bawaan QRIS hanya 5 menit — terlalu
pendek untuk pembeli yang harus berpindah aplikasi dulu.

`MIDTRANS_IS_PRODUCTION=true` memakai `app.midtrans.com`, artinya **uang
sungguhan**. Tanpa `MIDTRANS_SERVER_KEY`, tombol "Bayar sekarang" nonaktif dan
pesanan tetap bisa diselesaikan lewat WhatsApp.

## Yang masih menunggu

- **Testimoni** (`TESTIMONIALS` di `src/data/site.ts`) — sengaja kosong.
  Bagiannya tidak dirender selama larik itu kosong. Tidak diisi kutipan
  karangan.
- **Ulasan produk** — belum ada, sehingga `aggregateRating` di JSON-LD juga
  belum ada dan hasil pencarian Google masih tanpa bintang.

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
