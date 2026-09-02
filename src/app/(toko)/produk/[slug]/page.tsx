import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyBar } from "@/components/buy-bar";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { WaButton } from "@/components/wa-button";
import { SITE } from "@/data/site";
import { getIsiPaketToko, getProduct, getRelated } from "@/lib/catalog";
import { berat, rupiah } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

/**
 * Dirender saat permintaan, bukan dibangun statis.
 *
 * Katalog kini berasal dari MariaDB, dan build di Hostinger belum tentu
 * memegang kredensial basis data. Pramuat statis akan membuat seluruh
 * build gagal hanya karena tahap itu. Dengan force-dynamic, build tidak
 * pernah menyentuh basis data sama sekali.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Produk tidak ditemukan" };

  // Halaman produk situs lama sama sekali tidak punya deskripsi meta.
  const ringkas = p.description[0] ?? `${p.name} khas Betawi, ${berat(p.weightGram)}.`;
  return {
    title: p.name,
    description: `${ringkas} ${rupiah(p.price)}. Dikirim dari Jakarta Selatan.`.slice(0, 160),
    alternates: { canonical: `/produk/${p.slug}` },
    openGraph: {
      title: `${p.name} — ${rupiah(p.price)}`,
      description: ringkas,
      images: p.images[0] ? [{ url: p.images[0].src }] : undefined,
    },
  };
}

export default async function HalamanProduk({ params }: Props) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const [terkait, isiPaket] = await Promise.all([getRelated(slug, 4), getIsiPaketToko(slug)]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description.join(" ") || undefined,
    image: p.images.map((i) => `${SITE.url}${i.src}`),
    weight: { "@type": "QuantitativeValue", value: p.weightGram, unitCode: "GRM" },
    brand: { "@type": "Brand", name: SITE.name },
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "IDR",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE.url}/produk/${p.slug}`,
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav aria-label="Remah roti" className="mb-5 text-sm text-muted">
        <Link href="/" className="hover:text-jingga">Beranda</Link>
        <span className="px-1.5">/</span>
        <Link href={`/katalog?kategori=${p.category}`} className="capitalize hover:text-jingga">{p.category}</Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={p.images} dimmed={!p.inStock} />

        <div>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">
            {p.name}
          </h1>

          <p className="tabular mt-4 text-3xl font-extrabold">{rupiah(p.price)}</p>
          <p className="mt-1 text-sm text-muted">
            {berat(p.weightGram)}
            {!p.inStock && <span className="ml-2 font-semibold text-jingga">· stok habis</span>}
          </p>

          <div className="mt-6">
            <BuyBar slug={p.slug} inStock={p.inStock} />
          </div>

          {/* Isi paket dari data sungguhan, bukan dari teks deskripsi.
              Beratnya juga dihitung dari daftar ini, jadi keduanya tidak
              mungkin berbeda. */}
          {isiPaket.length > 0 && (
            <div className="mt-8 rounded-2xl border border-line bg-sunken p-5">
              <h2 className="font-display text-sm font-bold">Isi paket</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {isiPaket.map((i) => (
                  <li key={i.slug} className="flex items-center justify-between gap-4 py-2">
                    <Link href={`/produk/${i.slug}`} className="min-w-0 truncate hover:text-jingga">
                      {i.name}
                    </Link>
                    <span className="tabular shrink-0 font-semibold">{i.qty}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.description.length > 0 && (
            <div className="mt-8 space-y-2 border-t border-line pt-6 text-[15px] leading-relaxed text-ink-2">
              {p.description.map((baris, i) => (
                <p key={i}>{baris}</p>
              ))}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 border-t border-line pt-6 text-sm">
            <dt className="text-muted">Berat</dt>
            <dd className="tabular font-medium">{berat(p.weightGram)}</dd>
            <dt className="text-muted">Kategori</dt>
            <dd className="font-medium capitalize">{p.category}</dd>
            <dt className="text-muted">Dikirim dari</dt>
            <dd className="font-medium">Tanjung Barat, Jakarta Selatan</dd>
          </dl>

          <WaButton
            pesan={`Halo Romlah, saya mau tanya soal ${p.name} (${SITE.url}/produk/${p.slug})`}
            sumber="produk"
            produkSlug={p.slug}
            className="mt-6"
          >
            Tanya lewat WhatsApp
          </WaButton>
          <p className="mt-2 text-center text-xs text-muted">
            Dibalas jam {SITE.outlets[0].hours.split(", ")[1] ?? "09.00–17.00"}
          </p>
        </div>
      </div>

      {terkait.length > 0 && (
        <section className="mt-16">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Sering dibeli bersama</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {terkait.map((t) => (
              <ProductCard key={t.slug} product={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
