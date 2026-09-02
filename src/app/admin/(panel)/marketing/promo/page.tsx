import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { hapusPromoAksi } from "@/app/admin/actions";
import { listPromo, statistikPromo } from "@/lib/admin/promo";
import { rupiah } from "@/lib/format";
import { ringkasPromo } from "@/lib/promo-kode";

export const metadata = { title: "Kode promo" };
export const dynamic = "force-dynamic";

/** Waktu tersimpan UTC; jam toko WIB. */
const waktu = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

export default async function DaftarPromo() {
  const [promo, statistik] = await Promise.all([listPromo(), statistikPromo()]);
  const kini = new Date();

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Kode promo" />
      <AdminHeading
        title="Kode promo"
        description="Potongan yang ditebus pembeli di halaman keranjang."
        action={
          <Link
            href="/admin/marketing/promo/baru"
            className="rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink transition hover:brightness-110"
          >
            Kode baru
          </Link>
        }
      />

      {promo.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Belum ada kode promo</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-2">
            Kode dipakai pembeli di halaman keranjang. Besaran potongannya selalu dihitung ulang di
            server, jadi tidak bisa dipalsukan dari peramban.
          </p>
          <Link
            href="/admin/marketing/promo/baru"
            className="mt-5 inline-block rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink"
          >
            Buat kode pertama
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {promo.map((p) => {
            const stat = statistik[p.code] ?? { pesanan: 0, potongan: 0 };
            const belumMulai = p.mulai !== null && new Date(p.mulai) > kini;
            const lewat = p.berakhir !== null && new Date(p.berakhir) < kini;
            const habis = p.kuota !== null && p.terpakai >= p.kuota;
            const jalan = p.isActive && !belumMulai && !lewat && !habis;

            const alasanMati = !p.isActive
              ? "Dinonaktifkan"
              : belumMulai
                ? "Belum mulai"
                : lewat
                  ? "Kedaluwarsa"
                  : habis
                    ? "Kuota habis"
                    : null;

            return (
              <li key={p.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/marketing/promo/${p.id}`}
                        className="font-display tabular text-lg font-extrabold hover:text-jingga"
                      >
                        {p.code}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          jalan ? "bg-pandan-soft text-pandan" : "bg-line text-muted"
                        }`}
                      >
                        {jalan ? "Berjalan" : alasanMati}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-2">
                      {ringkasPromo({
                        code: p.code,
                        jenis: p.jenis,
                        nilai: p.nilai,
                        minBelanja: p.minBelanja,
                        maksPotongan: p.maksPotongan,
                      })}
                    </p>
                    {p.description && <p className="mt-0.5 text-xs text-muted">{p.description}</p>}
                  </div>

                  <div className="text-right text-xs text-muted">
                    <p className="tabular">
                      Ditebus {p.terpakai}
                      {p.kuota !== null && ` / ${p.kuota}`}
                    </p>
                    {stat.pesanan > 0 && (
                      <p className="tabular mt-0.5">
                        {stat.pesanan} pesanan · {rupiah(stat.potongan)}
                      </p>
                    )}
                    {(p.mulai || p.berakhir) && (
                      <p className="mt-0.5">
                        {waktu(p.mulai) ?? "kapan saja"} – {waktu(p.berakhir) ?? "tanpa akhir"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Link
                    href={`/admin/marketing/promo/${p.id}`}
                    className="rounded-lg border border-line-2 px-3.5 py-2 text-xs font-semibold transition hover:bg-sunken"
                  >
                    Ubah
                  </Link>
                  <form action={hapusPromoAksi}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      // Kode yang pernah ditebus tidak dihapus, hanya
                      // dinonaktifkan: pesanan lama menyimpan salinan kodenya
                      // untuk pelaporan.
                      title={
                        p.terpakai > 0
                          ? `Sudah ditebus ${p.terpakai} kali, jadi akan dinonaktifkan, bukan dihapus`
                          : "Belum pernah ditebus, jadi dihapus permanen"
                      }
                      className="rounded-lg border border-line-2 px-3.5 py-2 text-xs font-semibold text-ink-2 transition hover:bg-jingga-soft hover:text-jingga"
                    >
                      {p.terpakai > 0 ? "Nonaktifkan" : "Hapus"}
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
