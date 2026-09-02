import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { countCustomers } from "@/lib/admin/customers";
import { getDashboardStats, listCategories, listProducts } from "@/lib/admin/products";
import { rupiah } from "@/lib/format";
import { hitungLead } from "@/lib/leads";

export const metadata = { title: "Dasbor" };
export const dynamic = "force-dynamic";

function Kartu({
  label,
  nilai,
  catatan,
  href,
  tegas,
}: {
  label: string;
  nilai: number | string;
  catatan?: string;
  href?: string;
  tegas?: boolean;
}) {
  const isi = (
    <>
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">{label}</p>
      <p
        className={`font-display tabular mt-2 text-3xl font-extrabold ${tegas ? "text-jingga" : ""}`}
      >
        {nilai}
      </p>
      {catatan && <p className="mt-1 text-xs text-muted">{catatan}</p>}
    </>
  );

  const kelas = "rounded-2xl border border-line bg-surface p-5 shadow-card";
  return href ? (
    <Link href={href} className={`${kelas} block transition hover:border-line-2`}>
      {isi}
    </Link>
  ) : (
    <div className={kelas}>{isi}</div>
  );
}

export default async function Dasbor() {
  const [stat, kategori, produk, jumlahPelanggan, lead] = await Promise.all([
    getDashboardStats(),
    listCategories(),
    listProducts({ status: "aktif" }),
    countCustomers(),
    hitungLead(),
  ]);

  const nilaiKatalog = produk.reduce((n, p) => n + p.price, 0);
  const terbaru = produk.slice(0, 5);

  return (
    <>
      <AdminHeading title="Dasbor" description="Ringkasan isi toko." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kartu label="Produk aktif" nilai={stat.produkAktif} href="/admin/produk" />
        <Kartu
          label="Stok habis"
          nilai={stat.stokHabis}
          catatan={stat.stokHabis > 0 ? "Masih tampil di katalog, ditandai habis" : "Semua tersedia"}
          href="/admin/produk?status=habis"
          tegas={stat.stokHabis > 0}
        />
        <Kartu
          label="Tanpa foto"
          nilai={stat.tanpaFoto}
          catatan={stat.tanpaFoto > 0 ? "Perlu difoto sebelum dipajang" : "Semua produk berfoto"}
          tegas={stat.tanpaFoto > 0}
        />
        <Kartu
          label="Pesanan"
          nilai={stat.totalPesanan}
          catatan={stat.totalPesanan === 0 ? "Belum ada yang masuk" : undefined}
          href="/admin/pesanan"
        />
        <Kartu
          label="Pelanggan"
          nilai={jumlahPelanggan}
          catatan={jumlahPelanggan === 0 ? "Terisi saat pesanan pertama" : undefined}
          href="/admin/pelanggan"
        />
        <Kartu
          label="Inquiry WA"
          nilai={lead.total}
          catatan={
            lead.baru > 0
              ? `${lead.baru} belum ditindaklanjuti`
              : lead.total === 0
                ? "Terisi saat ada yang bertanya"
                : "Semua sudah ditindaklanjuti"
          }
          href="/admin/inquiry"
          tegas={lead.baru > 0}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-display font-bold">Terakhir diubah</h2>
            <Link href="/admin/produk" className="text-sm font-medium text-jingga hover:underline">
              Semua produk →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {terbaru.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/produk/${p.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-sunken"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {p.categoryName ?? "Tanpa kategori"} · {p.weightGram} g
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-bold">{rupiah(p.price)}</span>
                </Link>
              </li>
            ))}
            {terbaru.length === 0 && (
              <li className="px-5 py-10 text-center text-sm text-muted">
                Belum ada produk. Jalankan <code className="rounded bg-sunken px-1.5 py-0.5">scripts/db-setup.mjs</code>{" "}
                untuk mengisi katalog dari data lama.
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-surface shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display font-bold">Kategori</h2>
          </div>
          <ul className="divide-y divide-line">
            {kategori.map((k) => (
              <li key={k.id}>
                <Link
                  href={`/admin/produk?kategori=${k.slug}`}
                  className="flex items-center justify-between px-5 py-3.5 text-sm transition hover:bg-sunken"
                >
                  <span className="font-medium">
                    {k.name}
                    {!k.isActive && (
                      <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-muted">
                        Tidak tayang
                      </span>
                    )}
                  </span>
                  <span className="tabular text-muted">{k.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <p className="text-xs text-muted">Nilai katalog bila satu per produk</p>
            <p className="tabular font-display mt-1 text-xl font-extrabold">{rupiah(nilaiKatalog)}</p>
          </div>
        </section>
      </div>
    </>
  );
}
