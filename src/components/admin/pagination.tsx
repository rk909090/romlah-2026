import Link from "next/link";

/**
 * Paging untuk daftar di panel admin.
 *
 * Seluruhnya lewat URL, tanpa JavaScript: halaman ke berapa dan berapa baris
 * per halaman ikut tersalin saat tautannya dibagikan.
 *
 * Nomor halaman diringkas dengan elipsis begitu halamannya banyak — daftar
 * 40 nomor berjajar justru lebih susah dipakai daripada tidak ada sama sekali.
 */

export const PER_HALAMAN = [25, 50, 100, 200] as const;
export const PER_HALAMAN_BAWAAN = 25;

export type Halaman = {
  /** Halaman saat ini, mulai dari 1. */
  hal: number;
  per: number;
  /** Baris yang dilewati, siap dipakai di OFFSET. */
  lewati: number;
  totalHalaman: number;
  total: number;
};

/**
 * Baca `hal` dan `per` dari URL, lalu jepit ke rentang yang masuk akal.
 *
 * `total` diperlukan supaya halaman yang melampaui data — misalnya karena
 * saringan berubah — dibawa turun ke halaman terakhir, bukan menampilkan
 * daftar kosong tanpa penjelasan.
 */
export function bacaHalaman(
  sp: { hal?: string; per?: string },
  total: number,
): Halaman {
  const perMentah = Number(sp.per);
  const per = (PER_HALAMAN as readonly number[]).includes(perMentah)
    ? perMentah
    : PER_HALAMAN_BAWAAN;

  const totalHalaman = Math.max(1, Math.ceil(total / per));

  const halMentah = Number(sp.hal);
  const hal = Number.isInteger(halMentah) && halMentah >= 1 ? Math.min(halMentah, totalHalaman) : 1;

  return { hal, per, lewati: (hal - 1) * per, totalHalaman, total };
}

/** Nomor yang ditampilkan; null berarti elipsis. */
function nomor(hal: number, totalHalaman: number): (number | null)[] {
  if (totalHalaman <= 7) return Array.from({ length: totalHalaman }, (_, i) => i + 1);

  const set = new Set<number>([1, totalHalaman, hal, hal - 1, hal + 1]);
  const urut = [...set].filter((n) => n >= 1 && n <= totalHalaman).sort((a, b) => a - b);

  const hasil: (number | null)[] = [];
  let sebelum = 0;
  for (const n of urut) {
    if (sebelum && n - sebelum > 1) hasil.push(null);
    hasil.push(n);
    sebelum = n;
  }
  return hasil;
}

export function Pagination({
  basePath,
  h,
  lain = {},
  /** Kata untuk barisnya, misalnya "pesanan" atau "produk". */
  satuan = "baris",
}: {
  basePath: string;
  h: Halaman;
  lain?: Record<string, string | undefined>;
  satuan?: string;
}) {
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...lain, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const dari = h.total === 0 ? 0 : h.lewati + 1;
  const sampai = Math.min(h.lewati + h.per, h.total);

  const kelasNomor = (aktif: boolean) =>
    `grid h-9 min-w-9 place-items-center rounded-lg border px-2 text-xs font-semibold transition ${
      aktif ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:bg-sunken"
    }`;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
      <p className="text-xs text-muted">
        {h.total === 0 ? (
          <>Tidak ada {satuan}</>
        ) : (
          <>
            Menampilkan <b className="tabular text-ink-2">{dari}</b>–
            <b className="tabular text-ink-2">{sampai}</b> dari{" "}
            <b className="tabular text-ink-2">{h.total}</b> {satuan}
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {/* Jumlah baris per halaman. Bentuknya tautan, bukan <select>, supaya
            tidak butuh JavaScript untuk berpindah. */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">Per halaman</span>
          {PER_HALAMAN.map((n) => (
            <Link
              key={n}
              // Kembali ke halaman 1: baris ke-200 pada per-halaman 25 tidak
              // ada padanannya begitu per-halamannya diubah.
              href={href({ per: n === PER_HALAMAN_BAWAAN ? undefined : String(n), hal: undefined })}
              className={`tabular rounded-lg px-2 py-1 text-xs font-semibold transition ${
                h.per === n ? "bg-ink text-bg" : "text-ink-2 hover:bg-sunken"
              }`}
            >
              {n}
            </Link>
          ))}
        </div>

        {h.totalHalaman > 1 && (
          <nav aria-label="Navigasi halaman" className="flex items-center gap-1">
            <Link
              href={href({ hal: h.hal > 2 ? String(h.hal - 1) : undefined })}
              aria-disabled={h.hal === 1}
              className={`${kelasNomor(false)} ${h.hal === 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              ‹
            </Link>

            {nomor(h.hal, h.totalHalaman).map((n, i) =>
              n === null ? (
                <span key={`e${i}`} className="px-1 text-xs text-muted">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={href({ hal: n === 1 ? undefined : String(n) })}
                  aria-current={n === h.hal ? "page" : undefined}
                  className={kelasNomor(n === h.hal)}
                >
                  {n}
                </Link>
              ),
            )}

            <Link
              href={href({ hal: String(Math.min(h.totalHalaman, h.hal + 1)) })}
              aria-disabled={h.hal === h.totalHalaman}
              className={`${kelasNomor(false)} ${h.hal === h.totalHalaman ? "pointer-events-none opacity-40" : ""}`}
            >
              ›
            </Link>
          </nav>
        )}
      </div>
    </div>
  );
}
