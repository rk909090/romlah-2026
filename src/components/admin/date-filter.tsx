import Link from "next/link";
import { RENTANG, type Rentang } from "@/lib/admin/rentang";

/**
 * Penyaring tanggal untuk halaman admin.
 *
 * Seluruhnya lewat URL dan `<form method="get">`, tanpa JavaScript sendiri:
 * hasil saringan jadi bisa disalin, dibookmark, dan dibuka lagi persis sama.
 * Itu penting untuk laporan — "pesanan bulan lalu" harus bisa dikirim ke
 * orang lain sebagai tautan.
 *
 * Batas harinya dihitung dalam WIB lalu diubah ke UTC di lib/admin/rentang.ts;
 * lihat komentar di sana kalau angkanya terasa aneh.
 */

const kelasChip = (aktif: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
    aktif ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-2"
  }`;

export function DateFilter({
  basePath,
  r,
  lain = {},
}: {
  basePath: string;
  r: Rentang;
  /** Parameter lain yang harus ikut terbawa, misalnya pencarian dan status. */
  lain?: Record<string, string | undefined>;
}) {
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...lain, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <section className="mb-5 rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-widest text-muted uppercase">Periode</span>
        <span className="text-xs font-medium text-ink-2">{r.label}</span>
      </div>

      <div className="rail mt-3 flex gap-2">
        <Link href={href({ rentang: undefined, dari: undefined, sampai: undefined })} className={kelasChip(!r.aktif)}>
          Semua
        </Link>
        {(Object.keys(RENTANG) as (keyof typeof RENTANG)[]).map((k) => (
          <Link
            key={k}
            href={href({ rentang: r.rentang === k ? undefined : k, dari: undefined, sampai: undefined })}
            className={kelasChip(r.rentang === k)}
          >
            {RENTANG[k]}
          </Link>
        ))}
      </div>

      <form method="get" action={basePath} className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
        {/* Parameter lain ikut dikirim ulang, kalau tidak pencarian dan
            status akan hilang begitu tanggalnya diterapkan. */}
        {Object.entries(lain).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Dari</span>
          <input
            type="date"
            name="dari"
            defaultValue={r.dari ?? ""}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-jingga"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">Sampai</span>
          <input
            type="date"
            name="sampai"
            defaultValue={r.sampai ?? ""}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-jingga"
          />
        </label>

        <button
          type="submit"
          className="rounded-lg border border-line-2 bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-sunken"
        >
          Terapkan
        </button>

        {r.aktif && (
          <Link
            href={href({ rentang: undefined, dari: undefined, sampai: undefined })}
            className="px-1 py-2 text-xs font-medium text-jingga hover:underline"
          >
            Bersihkan
          </Link>
        )}
      </form>
    </section>
  );
}
