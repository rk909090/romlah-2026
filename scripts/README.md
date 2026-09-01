# Migrasi katalog dari WooCommerce lama

`woocommerce-products.raw.json` adalah jawaban mentah dari Store API publik
situs lama, ditarik 1 September 2026:

    curl "https://romlah.com/wp-json/wc/store/v1/products?per_page=100"

`extract.py` mengubahnya jadi `src/data/products.json` + manifest unduhan foto.
Dijalankan dua kali karena Python di mesin pengembang gagal verifikasi TLS ke
romlah.com — unduhan diserahkan ke curl:

    python scripts/extract.py scripts/woocommerce-products.raw.json \
        src/data/products.json public/produk /tmp/dl.txt
    curl --parallel --parallel-max 8 -sS --retry 2 -K /tmp/dl.txt
    python scripts/extract.py scripts/woocommerce-products.raw.json \
        src/data/products.json public/produk /tmp/dl.txt

Jalankan sekali lagi setelah unduhan supaya foto yang berhasil tersimpan ikut
tercatat di JSON. Hasil yang diharapkan: 39 produk, 66 foto, 0 produk tanpa foto.
