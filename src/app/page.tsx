import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { SITE, TESTIMONIALS } from "@/data/site";
import { CATEGORIES, countByCategory, getFeatured, getHeroProduct, getPackages, getProducts } from "@/lib/catalog";
import { berat, rupiah } from "@/lib/format";

const ALASAN = [
  { judul: "Dibuat sendiri", isi: "Diproduksi rumahan di Tanjung Barat, bukan barang reseller." },
  { judul: "Kirim se-Indonesia", isi: "Dikemas anti remuk, ongkir dihitung sebelum bayar." },
  { judul: "Bayar sesukamu", isi: "Transfer, QRIS, atau pesan langsung lewat WhatsApp." },
];

export default async function Beranda() {
  const [semua, unggulan, paket, hero] = await Promise.all([
    getProducts(),
    getFeatured(8),
    getPackages(),
    getHeroProduct(),
  ]);
  const jumlah = countByCategory(semua);
  const waHalo = `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(
    "Halo Romlah, saya mau tanya-tanya soal oleh-oleh.",
  )}`;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-8 pb-4 sm:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-jingga uppercase">
              Sejak 2015 di Tanjung Barat
            </p>
            <h1 className="font-display mt-4 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Oleh-oleh khas Betawi, dikirim hari ini juga.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink-2">
              Dodol, kue satu, bir pletok, dan {semua.length - 3} camilan Betawi lain — dibuat rumahan, dikemas rapi
              untuk jadi buah tangan.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/katalog"
                className="rounded-xl bg-jingga px-6 py-3.5 text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110"
              >
                Belanja sekarang
              </Link>
              <a
                href={waHalo}
                className="flex items-center gap-2 rounded-xl border border-pandan px-6 py-3.5 text-sm font-semibold text-pandan transition hover:bg-pandan-soft"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.9-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.7-.1 1.3Z" />
                </svg>
                Chat kami
              </a>
            </div>

            <p className="mt-5 text-xs text-muted">
              {SITE.outlets[0].name} · {SITE.outlets[0].hours}
            </p>
          </div>

          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-sunken lg:aspect-[5/4]">
            {hero?.images[0] && (
              <Image
                src={hero.images[0].src}
                alt={hero.images[0].alt}
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority
                className="object-cover"
              />
            )}
          </div>
        </div>
      </section>

      {/* ── Kategori ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rail flex gap-2.5">
          <Link
            href="/katalog"
            className="shrink-0 rounded-full border border-ink bg-ink px-4 py-2 text-sm font-medium text-bg"
          >
            Semua · {semua.length}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/katalog?kategori=${c.slug}`}
              className="shrink-0 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-2 transition hover:border-line-2"
            >
              {c.name} · {jumlah[c.slug]}
            </Link>
          ))}
        </div>
      </section>

      {/* ── Unggulan ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Sering jadi pilihan</h2>
          <Link href="/katalog" className="shrink-0 text-sm font-medium text-jingga hover:underline">
            Lihat semua →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {unggulan.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* ── Paket ────────────────────────────────────────────── */}
      {paket.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Paket hemat</h2>
          <p className="mt-2 max-w-lg text-sm text-ink-2">
            Sudah dirangkai jadi satu bingkisan. Beratnya dihitung otomatis, jadi ongkirnya akurat.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paket.map((p) => (
              <Link
                key={p.slug}
                href={`/produk/${p.slug}`}
                className="group flex overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:border-line-2"
              >
                <div className="relative aspect-square w-28 shrink-0 bg-sunken sm:w-32">
                  {p.images[0] && (
                    <Image
                      src={p.images[0].src}
                      alt={p.images[0].alt}
                      fill
                      sizes="128px"
                      className="object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center gap-1 p-3.5">
                  <h3 className="text-sm leading-snug font-semibold text-balance">{p.name}</h3>
                  <p className="text-xs text-muted">{berat(p.weightGram)}</p>
                  <p className="tabular mt-1 text-base font-bold">{rupiah(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Alasan ───────────────────────────────────────────── */}
      <section className="mt-6 border-y border-line bg-sunken">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-3">
          {ALASAN.map((a) => (
            <div key={a.judul}>
              <h3 className="font-display text-base font-bold">{a.judul}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{a.isi}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimoni — hanya tampil kalau datanya sudah ada ─── */}
      {TESTIMONIALS.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Kata pelanggan</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.authorName + t.reviewedAt} className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-sm text-warn" aria-label={`${t.rating} dari 5 bintang`}>
                  {"★".repeat(t.rating)}
                </div>
                <blockquote className="mt-3 text-sm leading-relaxed text-ink-2">{t.comment}</blockquote>
                <figcaption className="mt-3 text-xs text-muted">
                  {t.authorName} ·{" "}
                  <a href={t.sourceUrl} className="underline underline-offset-2">
                    Ulasan Google
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ── Outlet ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-10">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">Mampir ke toko</h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
            Ambil pesanan tanpa ongkir, atau pilih langsung di tempat.
          </p>
          <p className="mt-4 text-sm font-medium">{SITE.outlets[0].address}</p>
          <p className="text-sm text-muted">{SITE.outlets[0].hours}</p>
          <a
            href={SITE.maps}
            className="mt-5 inline-block rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
          >
            Buka di Google Maps
          </a>
        </div>
      </section>
    </>
  );
}
