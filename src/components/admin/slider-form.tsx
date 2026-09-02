"use client";

import { useActionState, useState } from "react";
import { simpanSlider, type FormState } from "@/app/admin/actions";
import { MAKS_SLIDE, SLIDE_KOSONG, tautanAman, type Slide, type Slider } from "@/lib/promo";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

/**
 * Susun slide banner beranda.
 *
 * Alamat gambarnya diketik, bukan diunggah: panel ini belum punya jalur
 * unggah berkas, dan berkas yang ditaruh manual di public/ akan hilang setiap
 * kali situs di-deploy ulang. Alamat penuh ke media di romlah.com yang lama
 * bekerja langsung tanpa perlu apa-apa.
 */
export function SliderForm({ nilai }: { nilai: Slider }) {
  const [state, action, pending] = useActionState(simpanSlider, AWAL);
  const [slides, setSlides] = useState<Slide[]>(nilai.slides);

  // Selalu bentuk fungsional; dua perubahan dalam satu batch React tidak
  // boleh saling menimpa.
  const ubah = (i: number, k: keyof Slide, v: string) =>
    setSlides((p) => p.map((s, n) => (n === i ? { ...s, [k]: v } : s)));

  const geser = (i: number, arah: -1 | 1) =>
    setSlides((p) => {
      const j = i + arah;
      if (j < 0 || j >= p.length) return p;
      const baru = [...p];
      [baru[i], baru[j]] = [baru[j], baru[i]];
      return baru;
    });

  return (
    <form action={action} className="flex flex-col gap-5">
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
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
          <input
            type="checkbox"
            name="aktif"
            defaultChecked={nilai.aktif}
            className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
          />
          <span>
            <span className="block text-sm font-semibold">Tampilkan slider di beranda</span>
            <span className="block text-xs leading-relaxed text-muted">
              Muncul di paling atas beranda, tepat di bawah menu. Slider tanpa slide sama sekali
              tidak akan tampil walau ini dinyalakan.
            </span>
          </span>
        </label>
      </section>

      {slides.map((s, i) => {
        const gambarSah = !s.gambar || tautanAman(s.gambar);
        const tautanSah = !s.tautan || tautanAman(s.tautan);
        return (
          <section key={i} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display font-bold">Slide {i + 1}</h2>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => geser(i, -1)}
                  disabled={i === 0}
                  aria-label={`Naikkan slide ${i + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-sunken disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => geser(i, 1)}
                  disabled={i === slides.length - 1}
                  aria-label={`Turunkan slide ${i + 1}`}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm transition hover:bg-sunken disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setSlides((p) => p.filter((_, n) => n !== i))}
                  className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:bg-jingga-soft hover:text-jingga"
                >
                  Hapus
                </button>
              </div>
            </div>

            <input type="hidden" name="gambar" value={s.gambar} />
            <input type="hidden" name="alt" value={s.alt} />
            <input type="hidden" name="judul" value={s.judul} />
            <input type="hidden" name="teks" value={s.teks} />
            <input type="hidden" name="tautan" value={s.tautan} />
            <input type="hidden" name="tombol" value={s.tombol} />

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr] lg:items-start">
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className={kelasLabel}>Alamat gambar (16:9)</span>
                  <input
                    value={s.gambar}
                    onChange={(e) => ubah(i, "gambar", e.target.value)}
                    className={kelasInput}
                    placeholder="https://romlah.com/wp-content/uploads/… atau /produk/foto.jpg"
                  />
                  <span className={`text-xs leading-relaxed ${gambarSah ? "text-muted" : "text-jingga"}`}>
                    {gambarSah
                      ? "Ukuran yang pas 1600×900 piksel. Gambar berbeda perbandingan akan dipotong tengahnya."
                      : "Harus diawali / untuk berkas di situs ini, atau http:// maupun https://."}
                  </span>
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={kelasLabel}>Teks pengganti gambar</span>
                  <input
                    value={s.alt}
                    onChange={(e) => ubah(i, "alt", e.target.value)}
                    maxLength={200}
                    className={kelasInput}
                    placeholder="Aneka paket oleh-oleh Romlah tersusun di meja"
                  />
                  <span className="text-xs text-muted">
                    Dibacakan pembaca layar dan tampil kalau gambarnya gagal dimuat.
                  </span>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={kelasLabel}>Judul (opsional)</span>
                    <input
                      value={s.judul}
                      onChange={(e) => ubah(i, "judul", e.target.value)}
                      maxLength={120}
                      className={kelasInput}
                      placeholder="Paket Lebaran sudah dibuka"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={kelasLabel}>Teks tombol (opsional)</span>
                    <input
                      value={s.tombol}
                      onChange={(e) => ubah(i, "tombol", e.target.value)}
                      maxLength={40}
                      className={kelasInput}
                      placeholder="Lihat paket"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className={kelasLabel}>Kalimat pendukung (opsional)</span>
                  <input
                    value={s.teks}
                    onChange={(e) => ubah(i, "teks", e.target.value)}
                    maxLength={200}
                    className={kelasInput}
                    placeholder="Gratis ongkir untuk belanja mulai Rp 250.000"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className={kelasLabel}>Tautan saat diklik (opsional)</span>
                  <input
                    value={s.tautan}
                    onChange={(e) => ubah(i, "tautan", e.target.value)}
                    className={kelasInput}
                    placeholder="/katalog?kategori=paket"
                  />
                  <span className={`text-xs ${tautanSah ? "text-muted" : "text-jingga"}`}>
                    {tautanSah
                      ? "Kosongkan supaya slide tidak bisa diklik."
                      : "Harus diawali / atau http:// maupun https://."}
                  </span>
                </label>
              </div>

              <div>
                <p className={kelasLabel}>Pratinjau</p>
                <div className="relative mt-1.5 aspect-video overflow-hidden rounded-xl border border-line bg-sunken">
                  {s.gambar && gambarSah ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.gambar} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      {(s.judul || s.teks || s.tombol) && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/40 to-transparent" />
                          <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4">
                            {s.judul && (
                              <p className="font-display max-w-[70%] text-sm leading-tight font-extrabold text-bg">
                                {s.judul}
                              </p>
                            )}
                            {s.teks && <p className="max-w-[70%] text-[10px] text-bg/85">{s.teks}</p>}
                            {s.tombol && (
                              <span className="mt-1 w-fit rounded-lg bg-jingga px-2.5 py-1 text-[10px] font-semibold text-jingga-ink">
                                {s.tombol}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="grid h-full place-items-center px-4 text-center text-xs text-muted">
                      Isi alamat gambarnya untuk melihat pratinjau
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Menyimpan…" : "Simpan slider"}
        </button>
        <button
          type="button"
          onClick={() => setSlides((p) => [...p, { ...SLIDE_KOSONG }])}
          disabled={slides.length >= MAKS_SLIDE}
          className="rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-45"
        >
          + Tambah slide {slides.length >= MAKS_SLIDE && `(maks ${MAKS_SLIDE})`}
        </button>
      </div>
    </form>
  );
}
