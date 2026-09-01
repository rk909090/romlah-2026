import Image from "next/image";
import Link from "next/link";
import { rupiah, berat } from "@/lib/format";
import type { Product } from "@/lib/types";
import { AddButton } from "./add-button";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const foto = product.images[0];

  return (
    // Pola "stretched link": seluruh kartu bisa diklik lewat ::after pada judul,
    // sehingga tombol tambah bisa berdiri sendiri tanpa tombol di dalam tautan.
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition hover:border-line-2">
      <div className="relative aspect-square overflow-hidden bg-sunken">
        {foto ? (
          <Image
            src={foto.src}
            alt={foto.alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            className={`object-cover transition duration-500 group-hover:scale-[1.03] ${
              product.inStock ? "" : "opacity-45 saturate-50"
            }`}
          />
        ) : null}

        {!product.inStock && (
          <span className="absolute top-2 left-2 rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-bg uppercase">
            Stok habis
          </span>
        )}

        {product.inStock && <AddButton slug={product.slug} label={`Tambah ${product.name}`} />}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="text-sm leading-snug font-semibold text-balance">
          <Link href={`/produk/${product.slug}`} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-muted">{berat(product.weightGram)}</p>
        <p className="tabular mt-auto pt-1 text-[15px] font-bold">{rupiah(product.price)}</p>
      </div>
    </article>
  );
}
