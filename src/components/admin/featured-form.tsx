"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { simpanUnggulan, type FormState } from "@/app/admin/actions";
import { rupiah } from "@/lib/format";

const AWAL: FormState = {};

export type CalonUnggulan = {
  id: number;
  name: string;
  price: number;
  firstImage: string | null;
  inStock: boolean;
  categoryName: string | null;
};

/**
 * Pilih dan urutkan produk unggulan beranda.
 *
 * Urutannya dikirim sebagai deretan input tersembunyi; indeks di dalam larik
 * itulah peringkatnya. Tidak memakai seret-lepas: tombol naik/turun bekerja
 * di layar sentuh maupun papan ketik tanpa pustaka tambahan.
 */
export function FeaturedForm({
  calon,
  awal,
  batas,
}: {
  calon: CalonUnggulan[];
  awal: number[];
  /** Berapa yang benar-benar tampil di beranda. */
  batas: number;
}) {
  const [state, action, pending] = useActionState(simpanUnggulan, AWAL);
  const [pilihan, setPilihan] = useState<number[]>(awal);

  const peta = new Map(calon.map((c) => [c.id, c]));
  const terpilih = pilihan.map((id) => peta.get(id)).filter((c): c is CalonUnggulan => Boolean(c));
  const sisa = calon.filter((c) => !pilihan.includes(c.id));

  // Selalu bentuk fungsional. Dua klik yang jatuh dalam satu batch React
  // memakai nilai state yang sama kalau ditulis langsung, dan yang terakhir
  // akan menimpa yang sebelumnya.
  const geser = (i: number, arah: -1 | 1) =>
    setPilihan((p) => {
      const j = i + arah;
      if (j < 0 || j >= p.length) return p;
      const baru = [...p];
      [baru[i], baru[j]] = [baru[j], baru[i]];
      return baru;
    });

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-4">
        {state.error && (
          <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="rounded-xl border border-pandan/40 bg-pandan-soft px-4 py-3 text-sm text-ink-2">
            {state.ok}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display font-bold">
            Dipilih <span className="text-muted">({terpilih.length})</span>
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Beranda menampilkan {batas} teratas. Sisanya tersimpan sebagai cadangan kalau ada yang
            kehabisan stok — produk yang stoknya habis otomatis dilewati.
          </p>

          {terpilih.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line-2 px-4 py-6 text-center text-sm text-muted">
              Belum ada yang dipilih. Beranda memakai urutan otomatis: produk tersedia dengan foto
              paling lengkap.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {terpilih.map((c, i) => (
                <li
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                    i < batas ? "border-line" : "border-dashed border-line-2 opacity-60"
                  }`}
                >
                  <input type="hidden" name="unggulan" value={c.id} />
                  <span className="tabular w-5 shrink-0 text-center text-xs font-bold text-muted">
                    {i + 1}
                  </span>
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sunken">
                    {c.firstImage && <Image src={c.firstImage} alt="" fill sizes="44px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="tabular text-xs text-muted">
                      {rupiah(c.price)}
                      {!c.inStock && <span className="text-jingga"> · stok habis</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => geser(i, -1)}
                      disabled={i === 0}
                      aria-label={`Naikkan ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-sunken disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => geser(i, 1)}
                      disabled={i === terpilih.length - 1}
                      aria-label={`Turunkan ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-sunken disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => setPilihan((p) => p.filter((id) => id !== c.id))}
                      aria-label={`Keluarkan ${c.name}`}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-jingga-soft hover:text-jingga"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
            >
              {pending ? "Menyimpan…" : "Simpan urutan"}
            </button>
            {pilihan.length > 0 && (
              <button
                type="button"
                onClick={() => setPilihan([])}
                className="rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
              >
                Kosongkan
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <h2 className="font-display font-bold">
          Bisa dipilih <span className="text-muted">({sisa.length})</span>
        </h2>
        <p className="mt-1 text-xs text-muted">Paket tidak masuk daftar ini; beranda punya baris paket sendiri.</p>

        <ul className="mt-4 max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
          {sisa.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setPilihan((p) => (p.includes(c.id) ? p : [...p, c.id]))}
                className="flex w-full items-center gap-3 rounded-xl border border-line p-2.5 text-left transition hover:border-line-2 hover:bg-sunken"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-sunken">
                  {c.firstImage && <Image src={c.firstImage} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="tabular block text-xs text-muted">
                    {rupiah(c.price)} · {c.categoryName ?? "tanpa kategori"}
                    {!c.inStock && <span className="text-jingga"> · stok habis</span>}
                  </span>
                </span>
                <span className="shrink-0 text-lg text-muted">+</span>
              </button>
            </li>
          ))}
          {sisa.length === 0 && (
            <li className="py-8 text-center text-sm text-muted">Semua produk sudah masuk daftar.</li>
          )}
        </ul>
      </section>
    </form>
  );
}
