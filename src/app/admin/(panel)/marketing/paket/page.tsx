import Image from "next/image";
import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { hapusPaketAksi, ubahKategoriAktif } from "@/app/admin/actions";
import { listPaket, listStatusKategori } from "@/lib/admin/packages";
import { berat, rupiah } from "@/lib/format";

export const metadata = { title: "Paket" };
export const dynamic = "force-dynamic";

export default async function MarketingPaket() {
  const [kategori, paket] = await Promise.all([listStatusKategori(), listPaket()]);
  const paketKategori = kategori.find((k) => k.slug === "paket");
  const paketNyala = paketKategori?.isActive ?? false;

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/marketing" className="hover:text-jingga">
          Marketing
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-ink-2">Paket</span>
      </nav>

      <AdminHeading
        title="Paket"
        description="Nyalakan Paket hanya selama ada program, dan susun isinya di sini."
        action={
          <Link
            href="/admin/marketing/paket/baru"
            className="rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink transition hover:brightness-110"
          >
            Paket baru
          </Link>
        }
      />

      {/* ── Sakelar kategori ────────────────────────────────────────── */}
      <section
        className={`rounded-2xl border p-5 shadow-card ${
          paketNyala ? "border-pandan/40 bg-pandan-soft" : "border-line bg-surface"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-display font-bold">Kategori Paket</h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  paketNyala ? "bg-pandan text-pandan-ink" : "bg-line text-muted"
                }`}
              >
                {paketNyala ? "Tayang" : "Tidak tayang"}
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-2">
              {paketNyala ? (
                <>
                  Paket sedang tampil di toko: muncul di menu, tab bar, katalog, dan beranda.
                  Mematikannya menyembunyikan <b>seluruh</b> paket sekaligus tanpa mengarsipkan satu
                  per satu — dan halaman produknya ikut hilang, jadi tautan lama akan menunjukkan
                  404.
                </>
              ) : (
                <>
                  Paket sedang tidak tayang. Seluruh {paketKategori?.jumlahProduk ?? 0} paket
                  tersembunyi dari toko, tapi datanya utuh dan bisa dinyalakan lagi kapan saja.
                </>
              )}
            </p>
          </div>

          <form action={ubahKategoriAktif}>
            <input type="hidden" name="slug" value="paket" />
            <input type="hidden" name="aktif" value={paketNyala ? "0" : "1"} />
            <button
              type="submit"
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                paketNyala
                  ? "border border-line-2 bg-surface hover:bg-bg"
                  : "bg-jingga text-jingga-ink hover:brightness-110"
              }`}
            >
              {paketNyala ? "Matikan Paket" : "Nyalakan Paket"}
            </button>
          </form>
        </div>
      </section>

      {/* ── Kategori lain ───────────────────────────────────────────── */}
      <section className="mt-5 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="font-display mb-3 font-bold">Kategori lain</h2>
        <ul className="divide-y divide-line text-sm">
          {kategori
            .filter((k) => k.slug !== "paket")
            .map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-4 py-2.5">
                <span>
                  <b>{k.name}</b> <span className="text-muted">· {k.jumlahProduk} produk aktif</span>
                  {!k.isActive && (
                    <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-muted">
                      Tidak tayang
                    </span>
                  )}
                </span>
                <form action={ubahKategoriAktif}>
                  <input type="hidden" name="slug" value={k.slug} />
                  <input type="hidden" name="aktif" value={k.isActive ? "0" : "1"} />
                  <button
                    type="submit"
                    className="rounded-lg border border-line-2 px-3.5 py-1.5 text-xs font-semibold transition hover:bg-sunken"
                  >
                    {k.isActive ? "Matikan" : "Nyalakan"}
                  </button>
                </form>
              </li>
            ))}
        </ul>
      </section>

      {/* ── Daftar paket ────────────────────────────────────────────── */}
      <h2 className="font-display mt-8 mb-3 text-lg font-extrabold">
        Paket <span className="text-muted">({paket.length})</span>
      </h2>

      {paket.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Belum ada paket</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">
            Buat paket dengan memilih produk yang jadi isinya. Beratnya dihitung sendiri dari isi,
            jadi ongkirnya akurat tanpa perlu ditaksir.
          </p>
          <Link
            href="/admin/marketing/paket/baru"
            className="mt-5 inline-block rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink"
          >
            Buat paket pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {paket.map((p) => {
            const hemat = p.hargaSatuan > 0 ? p.hargaSatuan - p.price : 0;
            return (
              <li
                key={p.id}
                className={`flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card ${
                  p.isActive ? "" : "opacity-70"
                }`}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sunken">
                  {p.firstImage && (
                    <Image src={p.firstImage} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/marketing/paket/${p.id}`}
                      className="font-display font-bold hover:text-jingga"
                    >
                      {p.name}
                    </Link>
                    {!p.isActive && (
                      <span className="rounded-full bg-line px-2 py-0.5 text-[10px] font-semibold text-muted">
                        Arsip
                      </span>
                    )}
                    {!p.inStock && (
                      <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-semibold text-warn">
                        Stok habis
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {p.jumlahIsi > 0 ? `${p.jumlahIsi} jenis isi` : "Isi belum didaftarkan"} ·{" "}
                    {berat(p.weightGram)}
                    {hemat > 0 && <> · hemat {rupiah(hemat)}</>}
                  </p>
                </div>

                <p className="tabular text-right font-bold">{rupiah(p.price)}</p>

                <div className="flex gap-2">
                  <Link
                    href={`/admin/marketing/paket/${p.id}`}
                    className="rounded-lg border border-line-2 px-3.5 py-2 text-xs font-semibold transition hover:bg-sunken"
                  >
                    Ubah
                  </Link>
                  <form action={hapusPaketAksi}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      // Paket yang pernah masuk pesanan tidak benar-benar
                      // dihapus, melainkan diarsipkan — nota lama menunjuk
                      // ke sini lewat kunci asing.
                      title={
                        p.dipakaiPesanan > 0
                          ? `Pernah masuk ${p.dipakaiPesanan} pesanan, jadi akan diarsipkan, bukan dihapus`
                          : "Belum pernah dipesan, jadi dihapus permanen"
                      }
                      className="rounded-lg border border-line-2 px-3.5 py-2 text-xs font-semibold text-ink-2 transition hover:bg-jingga-soft hover:text-jingga"
                    >
                      {p.dipakaiPesanan > 0 ? "Arsipkan" : "Hapus"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
