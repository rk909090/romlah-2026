export type CategorySlug = "makanan" | "minuman" | "paket";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  /** ID produk di WooCommerce lama. Disimpan untuk menelusuri balik saat migrasi. */
  legacyId: number;
  slug: string;
  name: string;
  /** Rupiah penuh, bukan sen. */
  price: number;
  weightGram: number;
  category: CategorySlug;
  /** Deskripsi situs lama, sudah dipecah per baris. */
  description: string[];
  images: ProductImage[];
  inStock: boolean;
  isVariable: boolean;
};

export type Category = {
  slug: CategorySlug;
  name: string;
  blurb: string;
};

export type CartLine = {
  slug: string;
  qty: number;
};

/** Baris keranjang yang sudah dipasangkan dengan datanya. */
export type ResolvedCartLine = {
  product: Product;
  qty: number;
  lineTotal: number;
  lineWeightGram: number;
};

export type Testimonial = {
  authorName: string;
  rating: number;
  comment: string;
  reviewedAt: string;
  sourceUrl: string;
};
