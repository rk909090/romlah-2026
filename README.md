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

## Belum dibuat

`/cerita`, `/reseller`, `/blog` — menunggu keputusan pemilik soal nasib 15
artikel lama (2017–2018) dan apakah program reseller masih berjalan.
