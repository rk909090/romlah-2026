-- Skema basis data Romlah — MariaDB 11.8 di Hostinger.
--
-- Ditulis sebagai SQL biasa, bukan lewat ORM, supaya tidak menambah
-- dependensi berskrip pascapasang yang sudah terbukti merepotkan di
-- lingkungan build Hostinger.
--
-- Seluruh perintah memakai IF NOT EXISTS sehingga aman dijalankan berulang.

-- ── Pengguna admin ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190)    NOT NULL,
  name          VARCHAR(120)    NOT NULL,
  -- scrypt dari modul crypto bawaan Node: "scrypt$N$r$p$salt$hash" (hex).
  -- Sengaja tidak memakai bcrypt agar tidak ada binding native.
  password_hash VARCHAR(255)    NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Sesi login ────────────────────────────────────────────────────────
-- Token disimpan sebagai hash, bukan nilai aslinya. Bocornya isi tabel
-- tidak cukup untuk membajak sesi.
CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash  CHAR(64)      NOT NULL,
  user_id     INT UNSIGNED  NOT NULL,
  expires_at  DATETIME      NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  user_agent  VARCHAR(255)  NULL,
  PRIMARY KEY (token_hash),
  KEY idx_admin_sessions_user (user_id),
  KEY idx_admin_sessions_expires (expires_at),
  CONSTRAINT fk_admin_sessions_user FOREIGN KEY (user_id)
    REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Kategori ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(80)   NOT NULL,
  name       VARCHAR(120)  NOT NULL,
  blurb      VARCHAR(255)  NOT NULL DEFAULT '',
  sort_order INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Produk ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(190)   NOT NULL,
  name         VARCHAR(190)   NOT NULL,
  -- Rupiah penuh. Tidak ada sen di harga ritel Indonesia, jadi integer
  -- lebih tepat daripada desimal dan bebas galat pembulatan.
  price        INT UNSIGNED   NOT NULL,
  weight_gram  INT UNSIGNED   NOT NULL,
  category_id  INT UNSIGNED   NULL,
  description  TEXT           NULL,
  in_stock     TINYINT(1)     NOT NULL DEFAULT 1,
  is_active    TINYINT(1)     NOT NULL DEFAULT 1,
  -- ID produk di WooCommerce lama, untuk menelusuri balik saat migrasi.
  legacy_id    INT UNSIGNED   NULL,
  created_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category_id),
  KEY idx_products_aktif (is_active, in_stock),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id)
    REFERENCES categories (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Foto produk ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED  NOT NULL,
  src        VARCHAR(255)  NOT NULL,
  alt        VARCHAR(255)  NOT NULL DEFAULT '',
  sort_order INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_product_images_product (product_id, sort_order),
  UNIQUE KEY uq_product_images_src (product_id, src),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Pelanggan ─────────────────────────────────────────────────────────
-- Kuncinya NOMOR TELEPON, bukan email. Pembeli lewat WhatsApp datang
-- membawa nomor, bukan alamat email; tanpa ini pesanan dari WhatsApp dan
-- dari website tidak akan pernah bisa disatukan jadi satu riwayat.
--
-- Nomor disimpan dalam bentuk ternormalisasi (hanya angka, berawalan 62)
-- supaya "0812...", "+62812...", dan "62812..." menunjuk orang yang sama.
CREATE TABLE IF NOT EXISTS customers (
  id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  phone         VARCHAR(24)   NOT NULL,
  name          VARCHAR(190)  NOT NULL,
  email         VARCHAR(190)  NULL,
  note          VARCHAR(255)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_order_at DATETIME      NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_customers_phone (phone),
  KEY idx_customers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Alamat pelanggan ──────────────────────────────────────────────────
-- Disimpan terpisah supaya pembeli lama bisa memesan ulang tanpa mengetik
-- alamatnya lagi, dan supaya satu orang boleh punya lebih dari satu tujuan.
CREATE TABLE IF NOT EXISTS customer_addresses (
  id                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  customer_id       INT UNSIGNED  NOT NULL,
  label             VARCHAR(60)   NULL,
  recipient_name    VARCHAR(190)  NOT NULL,
  phone             VARCHAR(24)   NOT NULL,
  address           TEXT          NOT NULL,
  destination_id    VARCHAR(64)   NULL,   -- id area Biteship
  destination_label VARCHAR(255)  NULL,
  is_default        TINYINT(1)    NOT NULL DEFAULT 0,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_addresses_customer (customer_id, is_default),
  CONSTRAINT fk_customer_addresses_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Pesanan ───────────────────────────────────────────────────────────
-- Tabel disiapkan sekarang supaya alur WhatsApp bisa mulai mencatat
-- pesanan tanpa perubahan skema lagi. Belum ada yang menulis ke sini.
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_number   VARCHAR(32)   NOT NULL,
  customer_id    INT UNSIGNED  NULL,
  channel        ENUM('web','whatsapp') NOT NULL DEFAULT 'whatsapp',
  status         ENUM('menunggu_konfirmasi','menunggu_bayar','dibayar',
                      'diproses','dikirim','selesai','dibatalkan',
                      'kedaluwarsa','dikembalikan')
                 NOT NULL DEFAULT 'menunggu_konfirmasi',
  customer_name  VARCHAR(190)  NOT NULL,
  customer_phone VARCHAR(40)   NOT NULL,
  customer_email VARCHAR(190)  NULL,
  address        TEXT          NULL,
  destination_id VARCHAR(64)   NULL,   -- id area Biteship
  destination_label VARCHAR(255) NULL,
  courier        VARCHAR(40)   NULL,
  courier_service VARCHAR(40)  NULL,
  etd            VARCHAR(40)   NULL,
  subtotal       INT UNSIGNED  NOT NULL DEFAULT 0,
  shipping_cost  INT UNSIGNED  NOT NULL DEFAULT 0,
  total          INT UNSIGNED  NOT NULL DEFAULT 0,
  weight_gram    INT UNSIGNED  NOT NULL DEFAULT 0,
  midtrans_order_id VARCHAR(64) NULL,
  tracking_number VARCHAR(64)  NULL,
  paid_at        DATETIME      NULL,
  created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                               ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_status (status, created_at),
  KEY idx_orders_phone (customer_phone),
  KEY idx_orders_customer (customer_id),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Baris pesanan ─────────────────────────────────────────────────────
-- Nama, harga, dan berat DISALIN saat pesanan dibuat. Kalau harga produk
-- berubah bulan depan, nota lama tidak ikut berubah.
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED  NOT NULL,
  product_id  INT UNSIGNED  NULL,
  name        VARCHAR(190)  NOT NULL,
  qty         INT UNSIGNED  NOT NULL,
  unit_price  INT UNSIGNED  NOT NULL,
  weight_gram INT UNSIGNED  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id)
    REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Migrasi untuk basis data yang sudah terlanjur dibuat ──────────────
-- Tabel orders dibuat lebih dulu tanpa kolom customer_id. CREATE TABLE
-- IF NOT EXISTS tidak akan menambahkannya, jadi diperlukan ALTER.
-- `IF NOT EXISTS` pada ALTER adalah perluasan MariaDB, bukan MySQL —
-- aman di sini karena Hostinger menjalankan MariaDB 11.8.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id INT UNSIGNED NULL AFTER order_number;
ALTER TABLE orders ADD KEY IF NOT EXISTS idx_orders_customer (customer_id);
-- Catatan sintaks: pada MariaDB, `IF NOT EXISTS` untuk kunci asing diletakkan
-- SESUDAH `FOREIGN KEY`, bukan sesudah `ADD CONSTRAINT`.
ALTER TABLE orders ADD CONSTRAINT fk_orders_customer
  FOREIGN KEY IF NOT EXISTS (customer_id) REFERENCES customers (id) ON DELETE SET NULL;

-- ── Pindah dari RajaOngkir ke Biteship ────────────────────────────────
-- ID area Biteship berupa string ("IDNP6IDNC148IDND837IDZ12530"), bukan
-- angka seperti ID tujuan RajaOngkir. MODIFY aman dijalankan berulang:
-- menerapkannya pada kolom yang sudah VARCHAR tidak mengubah apa pun.
ALTER TABLE orders            MODIFY COLUMN destination_id VARCHAR(64) NULL;
ALTER TABLE customer_addresses MODIFY COLUMN destination_id VARCHAR(64) NULL;

-- Email pembeli, opsional. Disalin ke pesanan seperti nama dan telepon,
-- mengikuti prinsip yang sama: nota lama tidak ikut berubah bila pelanggan
-- kelak memperbarui datanya.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email VARCHAR(190) NULL AFTER customer_phone;

-- ── Kategori bisa dinyalakan/dimatikan ────────────────────────────────
-- Dipakai untuk kategori Paket: bundling hanya dijual saat ada program
-- pemasaran, jadi seluruh kategorinya perlu bisa disembunyikan dari toko
-- tanpa harus mengarsipkan produknya satu per satu.
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1;

-- ── Isi paket ─────────────────────────────────────────────────────────
-- Sebuah paket adalah produk biasa di kategori "paket" yang isinya
-- ditunjuk ke produk lain. Beratnya dihitung dari isi ini, bukan diketik
-- ulang, supaya ongkir tidak pernah meleset dari isi paket sebenarnya.
--
-- Harga TIDAK dihitung dari isi: potongan harga justru inti dari paket.
CREATE TABLE IF NOT EXISTS package_items (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  package_id  INT UNSIGNED  NOT NULL,   -- products.id milik paketnya
  product_id  INT UNSIGNED  NOT NULL,   -- products.id milik isinya
  qty         INT UNSIGNED  NOT NULL DEFAULT 1,
  sort_order  INT           NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_package_items (package_id, product_id),
  KEY idx_package_items_package (package_id, sort_order),
  CONSTRAINT fk_package_items_package FOREIGN KEY (package_id)
    REFERENCES products (id) ON DELETE CASCADE,
  -- Isi paket tidak boleh dihapus diam-diam: RESTRICT memaksa produk
  -- dikeluarkan dari paket lebih dulu sebelum produknya bisa dihapus.
  CONSTRAINT fk_package_items_product FOREIGN KEY (product_id)
    REFERENCES products (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Prospek dari WhatsApp ─────────────────────────────────────────────
-- Setiap tombol WhatsApp di toko (kecuali "Pesan lewat WhatsApp" di
-- keranjang, yang sudah membuat pesanan sungguhan) meminta data pengunjung
-- lebih dulu. Tanpa ini, percakapan WhatsApp tidak meninggalkan jejak apa
-- pun yang bisa ditindaklanjuti.
--
-- Nomor disimpan ternormalkan (62…) mengikuti tabel customers, supaya
-- prospek dan pembeli lama bisa disatukan lewat customer_id.
CREATE TABLE IF NOT EXISTS wa_leads (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  customer_id  INT UNSIGNED  NULL,
  name         VARCHAR(190)  NOT NULL,
  phone        VARCHAR(24)   NOT NULL,
  email        VARCHAR(190)  NULL,
  message      TEXT          NULL,
  -- Dari mana tombolnya ditekan: beranda, produk, toko, pesanan, footer.
  source       VARCHAR(40)   NOT NULL DEFAULT 'lain',
  product_slug VARCHAR(190)  NULL,
  page_path    VARCHAR(255)  NULL,
  status       ENUM('baru','dihubungi','prospek','jadi_pesanan','batal')
               NOT NULL DEFAULT 'baru',
  admin_note   VARCHAR(500)  NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                             ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_wa_leads_status (status, created_at),
  KEY idx_wa_leads_phone (phone),
  KEY idx_wa_leads_customer (customer_id),
  KEY idx_wa_leads_dibuat (created_at),
  CONSTRAINT fk_wa_leads_customer FOREIGN KEY (customer_id)
    REFERENCES customers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Pengaturan toko ───────────────────────────────────────────────────
-- Satu baris per pengaturan, isinya JSON. Dipilih bentuk kunci–nilai, bukan
-- satu tabel berkolom tetap, karena pengaturan pemasaran datang dan pergi:
-- menambah program baru tidak boleh berarti migrasi skema lagi.
--
-- Kolomnya sengaja bernama setting_key, bukan `key`: KEY adalah kata kunci
-- MySQL dan harus dikutip di setiap kueri kalau dipakai apa adanya.
CREATE TABLE IF NOT EXISTS settings (
  setting_key VARCHAR(64) NOT NULL,
  value       TEXT        NOT NULL,
  updated_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP
                          ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
