"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/types";

/**
 * Galeri foto produk.
 *
 * Foto utamanya berupa deretan yang digulir mendatar dengan scroll-snap,
 * bukan satu gambar yang ditukar-tukar. Dengan begitu geser jari di ponsel,
 * roda mouse mendatar, dan papan ketik bekerja langsung dari peramban —
 * tanpa satu pun penangan sentuh buatan sendiri, dan momentum di iOS terasa
 * benar dengan sendirinya.
 *
 * Thumbnail tetap ada dan sekarang menggulir deretan itu, bukan mengganti
 * gambar. Indeks aktifnya dibaca DARI posisi gulir, jadi tetap benar entah
 * digeser jari atau ditekan thumbnail-nya.
 */
export function ProductGallery({ images, dimmed = false }: { images: ProductImage[]; dimmed?: boolean }) {
  const rel = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);

  useEffect(() => {
    const el = rel.current;
    if (!el || images.length < 2) return;

    // Dibaca langsung di penangan, bukan lewat requestAnimationFrame:
    // rAF berhenti selama tab tidak terlihat, sehingga penandanya bisa
    // tertinggal di slide yang salah saat pengunjung kembali. Peristiwa
    // scroll sendiri sudah dibatasi peramban sekitar sekali per rangka.
    const onScroll = () => {
      const lebar = el.clientWidth;
      if (lebar > 0) setAktif(Math.round(el.scrollLeft / lebar));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Dijalankan sekali di awal: posisi gulir bisa saja sudah tidak nol,
    // misalnya setelah peramban memulihkan posisi halaman.
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [images.length]);

  if (images.length === 0) {
    return <div className="aspect-square rounded-2xl border border-line bg-sunken" aria-hidden />;
  }

  const ke = (i: number) => {
    const el = rel.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      <div className="relative">
        <div
          ref={rel}
          className="rail flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-line bg-sunken"
        >
          {images.map((img, i) => (
            <div key={img.src} className="relative aspect-square w-full shrink-0 snap-center">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={i === 0}
                className={`object-cover ${dimmed ? "opacity-50 saturate-50" : ""}`}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden">
            {images.map((img, i) => (
              <span
                key={img.src}
                className={`h-1.5 rounded-full transition-all ${
                  i === aktif ? "w-5 bg-bg" : "w-1.5 bg-bg/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="rail mt-3 flex gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => ke(i)}
              aria-label={`Foto ${i + 1} dari ${images.length}`}
              aria-current={i === aktif}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                i === aktif ? "border-jingga" : "border-line hover:border-line-2"
              }`}
            >
              <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
