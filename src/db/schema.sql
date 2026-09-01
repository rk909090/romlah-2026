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

-- ── Pesanan ───────────────────────────────────────────────────────────
-- Tabel disiapkan sekarang supaya alur WhatsApp bisa mulai mencatat
-- pesanan tanpa perubahan skema lagi. Belum ada yang menulis ke sini.
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_number   VARCHAR(32)   NOT NULL,
  channel        ENUM('web','whatsapp') NOT NULL DEFAULT 'whatsapp',
  status         ENUM('menunggu_konfirmasi','menunggu_bayar','dibayar',
                      'diproses','dikirim','selesai','dibatalkan',
                      'kedaluwarsa','dikembalikan')
                 NOT NULL DEFAULT 'menunggu_konfirmasi',
  customer_name  VARCHAR(190)  NOT NULL,
  customer_phone VARCHAR(40)   NOT NULL,
  address        TEXT          NULL,
  destination_id INT UNSIGNED  NULL,   -- id tujuan RajaOngkir
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
  KEY idx_orders_phone (customer_phone)
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
