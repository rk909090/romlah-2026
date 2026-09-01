import Image from "next/image";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ubahArsip } from "@/app/admin/actions";
import { listCategories, listProducts } from "@/lib/admin/products";
import { berat, rupiah } from "@/lib/format";

export const metadata = { title: "Produk" };

const STATUS = [
  { key: "", label: "Semua" },
  { key: "aktif", label: "Aktif" },
  { key: "habis", label: "Stok habis" },
  { key: "arsip", label: "Arsip" },
] as const;

function tautan(sp: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/admin/produk?${s}` : "/admin/produk";
}

export default async function DaftarProduk({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kategori?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const status = (["aktif", "arsip", "habis"] as const).find((s) => s === sp.status);

  const [produk, kategori] = await Promise.all([
    listProducts({ q: sp.q, kategori: sp.kategori, status }),
    listCategories(),
  ]);

  const kini = { q: sp.q, kategori: sp.kategori, status: sp.status };

  return (
    <>
      <AdminHeading
        title="Produk"
        description={`${produk.length} produk cocok dengan tapisan saat ini.`}
        action={
          <Link
            href="/admin/produk/baru"
            className="rounded-xl bg-jingga px-4 py-2.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110"
          >
            + Produk baru
          </Link>
        }
      />

      {/* Tapisan lewat URL, jadi tautannya bisa dibagikan dan ditandai */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:flex-row sm:items-center">
        <form method="get" className="flex-1">
          {sp.kategori && <input type="hidden" name="kategori" value={sp.kategori} />}
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari nama atau slug…"
            className="w-full rounded-xl border border-line bg-bg px-4 py-2.5 text-sm outline-none focus:border-jingga"
          />
        </form>

        <div className="flex flex-wrap gap-1.5">
          {STATUS.map((s) => {
            const aktif = (sp.status ?? "") === s.key;
            return (
              <Link
                key={s.key || "semua"}
                href={tautan(kini, { status: s.key || undefined })}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  aktif ? "bg-ink text-bg" : "bg-sunken text-ink-2 hover:text-ink"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {kategori.map((k) => {
            const aktif = sp.kategori === k.slug;
            return (
              <Link
                key={k.id}
                href={tautan(kini, { kategori: aktif ? undefined : k.slug })}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  aktif ? "bg-jingga text-jingga-ink" : "bg-sunken text-ink-2 hover:text-ink"
                }`}
              >
                {k.name}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line bg-sunken text-left">
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Produk</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Kategori</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Harga</th>
                <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Berat</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {produk.map((p) => (
                <tr key={p.id} className={p.isActive ? "" : "opacity-55"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sunken">
                        {p.firstImage && (
                          <Image src={p.firstImage} alt="" fill sizes="44px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link href={`/admin/produk/${p.id}`} className="block truncate font-semibold hover:text-jingga">
                          {p.name}
                        </Link>
                        <span className="block truncate text-xs text-muted">/{p.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{p.categoryName ?? "—"}</td>
                  <td className="tabular px-4 py-3 text-right font-semibold">{rupiah(p.price)}</td>
                  <td className="tabular px-4 py-3 text-right text-ink-2">{berat(p.weightGram)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {!p.isActive && (
                        <span className="rounded-full bg-sunken px-2 py-1 text-[11px] font-semibold text-muted">
                          Arsip
                        </span>
                      )}
                      {p.isActive && !p.inStock && (
                        <span className="rounded-full bg-jingga-soft px-2 py-1 text-[11px] font-semibold text-jingga">
                          Stok habis
                        </span>
                      )}
                      {p.isActive && p.inStock && (
                        <span className="rounded-full bg-pandan-soft px-2 py-1 text-[11px] font-semibold text-pandan">
                          Tersedia
                        </span>
                      )}
                      {p.imageCount === 0 && (
                        <span className="rounded-full bg-warn-soft px-2 py-1 text-[11px] font-semibold text-warn">
                          Tanpa foto
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={ubahArsip} className="inline">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="aksi" value={p.isActive ? "arsipkan" : "pulihkan"} />
                      <button
                        type="submit"
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:bg-sunken"
                      >
                        {p.isActive ? "Arsipkan" : "Pulihkan"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {produk.length === 0 && (
          <div className="px-5 py-14 text-center">
            <p className="font-display font-bold">Tidak ada produk yang cocok</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-2">
              Longgarkan tapisannya, atau tambahkan produk baru.
            </p>
            <Link href="/admin/produk" className="mt-4 inline-block text-sm font-medium text-jingga hover:underline">
              Atur ulang tapisan
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
