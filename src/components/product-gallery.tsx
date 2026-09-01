"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/types";

export function ProductGallery({ images, dimmed = false }: { images: ProductImage[]; dimmed?: boolean }) {
  const [aktif, setAktif] = useState(0);
  const utama = images[aktif] ?? images[0];

  if (!utama) {
    return <div className="aspect-square rounded-2xl border border-line bg-sunken" aria-hidden />;
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-sunken">
        <Image
          src={utama.src}
          alt={utama.alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className={`object-cover ${dimmed ? "opacity-50 saturate-50" : ""}`}
        />
      </div>

      {images.length > 1 && (
        <div className="rail mt-3 flex gap-2.5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setAktif(i)}
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
