import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { countByCategory, getCategories, getProducts } from "@/lib/catalog";
import type { CategorySlug, Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Katalog",
  description: "Semua camilan, minuman, dan paket oleh-oleh khas Betawi dari Romlah.",
};

// Katalog dibaca dari basis data saat permintaan; build tidak menyentuh DB.
export const dynamic = "force-dynamic";

type Urut = "nama" | "termurah" | "termahal" | "teringan";

const RENTANG = {
  murah: { label: "< Rp 25rb", uji: (p: Product) => p.price < 25_000 },
  sedang: { label: "Rp 25–50rb", uji: (p: Product) => p.price >= 25_000 && p.price <= 50_000 },
  mahal: { label: "> Rp 50rb", uji: (p: Product) => p.price > 50_000 },
} as const;

type RentangKey = keyof typeof RENTANG;

function urutkan(list: Product[], urut: Urut): Product[] {
  const salinan = [...list];
  switch (urut) {
    case "termurah":
      return salinan.sort((a, b) => a.price - b.price);
    case "termahal":
      return salinan.sort((a, b) => b.price - a.price);
    case "teringan":
      return salinan.sort((a, b) => a.weightGram - b.weightGram);
    default:
      return salinan.sort((a, b) => a.name.localeCompare(b.name, "id"));
  }
}

/** Bangun ulang querystring sambil mengganti satu kunci — dipakai semua chip. */
function href(current: Record<string, string | undefined>, patch: Record<string, string | undefined>): string {
  const next = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/katalog?${s}` : "/katalog";
}

function Chip({ aktif, href: to, children }: { aktif: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={to}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
        aktif
          ? "border-ink bg-ink text-bg"
          : "border-line bg-surface text-ink-2 hover:border-line-2"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function Katalog({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; q?: string; urut?: string; harga?: string; stok?: string }>;
}) {
  const sp = await searchParams;
  const daftarKategori = await getCategories();
  const kategori = daftarKategori.some((c) => c.slug === sp.kategori)
    ? (sp.kategori as CategorySlug)
    : undefined;
  const q = sp.q?.trim() ?? "";
  const urut = (["nama", "termurah", "termahal", "teringan"] as const).includes(sp.urut as Urut)
    ? (sp.urut as Urut)
    : "nama";
  const harga = (sp.harga && sp.harga in RENTANG ? sp.harga : undefined) as RentangKey | undefined;
  const hanyaTersedia = sp.stok === "ada";

  const semua = await getProducts();
  const jumlah = countByCategory(semua);

  let hasil = semua;
  if (kategori) hasil = hasil.filter((p) => p.category === kategori);
  if (q) {
    const term = q.toLowerCase();
    hasil = hasil.filter(
      (p) => p.name.toLowerCase().includes(term) || p.description.join(" ").toLowerCase().includes(term),
    );
  }
  if (harga) hasil = hasil.filter(RENTANG[harga].uji);
  if (hanyaTersedia) hasil = hasil.filter((p) => p.inStock);
  hasil = urutkan(hasil, urut);

  const now = { kategori: sp.kategori, q: sp.q, urut: sp.urut, harga: sp.harga, stok: sp.stok };
  const adaFilter = Boolean(kategori || q || harga || hanyaTersedia);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
        {kategori ? daftarKategori.find((c) => c.slug === kategori)!.name : "Katalog"}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        {kategori ? daftarKategori.find((c) => c.slug === kategori)!.blurb : "Semua produk Romlah dalam satu halaman."}
      </p>

      {/* Kategori */}
      <div className="rail mt-6 flex gap-2.5">
        <Chip aktif={!kategori} href={href(now, { kategori: undefined })}>
          Semua · {semua.length}
        </Chip>
        {daftarKategori.map((c) => (
          <Chip key={c.slug} aktif={kategori === c.slug} href={href(now, { kategori: c.slug })}>
            {c.name} · {jumlah[c.slug]}
          </Chip>
        ))}
      </div>

      {/* Penyaring lanjutan — seluruhnya lewat URL, tetap jalan tanpa JavaScript */}
      <div className="rail mt-3 flex items-center gap-2.5 border-t border-line pt-3">
        <span className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">Harga</span>
        {(Object.keys(RENTANG) as RentangKey[]).map((k) => (
          <Chip key={k} aktif={harga === k} href={href(now, { harga: harga === k ? undefined : k })}>
            {RENTANG[k].label}
          </Chip>
        ))}
        <Chip aktif={hanyaTersedia} href={href(now, { stok: hanyaTersedia ? undefined : "ada" })}>
          Hanya yang tersedia
        </Chip>
      </div>

      <div className="rail mt-3 flex items-center gap-2.5">
        <span className="shrink-0 text-xs font-semibold tracking-widest text-muted uppercase">Urut</span>
        {(
          [
            ["nama", "A–Z"],
            ["termurah", "Termurah"],
            ["termahal", "Termahal"],
            ["teringan", "Teringan"],
          ] as const
        ).map(([key, label]) => (
          <Chip key={key} aktif={urut === key} href={href(now, { urut: key === "nama" ? undefined : key })}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 text-sm">
        <p className="text-muted">
          {hasil.length} produk{q && <> untuk “{q}”</>}
        </p>
        {adaFilter && (
          <Link href="/katalog" className="font-medium text-jingga hover:underline">
            Atur ulang
          </Link>
        )}
      </div>

      {hasil.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {hasil.map((p, i) => (
            <ProductCard key={p.slug} product={p} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="font-display text-lg font-bold">Tidak ada yang cocok</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
            Coba kata kunci lain, atau lepas sebagian penyaringnya.
          </p>
          <Link
            href="/katalog"
            className="mt-5 inline-block rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink"
          >
            Lihat semua produk
          </Link>
        </div>
      )}
    </div>
  );
}
