# romlah-web

Bangun ulang romlah.com dengan Next.js. Tahap ini **UI saja** — database belum
disambungkan, sesuai permintaan.

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

Semua halaman produk dibangun statis saat `build` (39 halaman SSG).

## Data

`src/data/products.json` — hasil migrasi dari WooCommerce lama lewat Store API
publik. 39 produk, 66 foto di `public/produk/`. Foto duplikat yang ada di situs
lama sudah disaring.

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
- **Nomor pesanan** — dibuat di browser, belum tersimpan. Harus pindah ke server
  begitu database aktif.
- **Testimoni** (`TESTIMONIALS` di `src/data/site.ts`) — sengaja kosong.
  Bagiannya tidak dirender selama larik itu kosong. Tidak diisi kutipan karangan.

## Seam untuk database

Halaman tidak pernah menyentuh sumber data langsung. Semuanya lewat
`src/lib/catalog.ts`, dan seluruh fungsinya sudah `async` supaya penggantian ke
database tidak mengubah tanda tangan fungsi di pemanggilnya.

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
