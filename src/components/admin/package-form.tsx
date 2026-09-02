"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { simpanPaketAksi, type FormState } from "@/app/admin/actions";
import { berat, rupiah } from "@/lib/format";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

function keSlug(teks: string) {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CalonIsi = {
  id: number;
  name: string;
  price: number;
  weightGram: number;
  inStock: boolean;
};

export type PaketAwal = {
  id: number;
  slug: string;
  name: string;
  price: number;
  weightGram: number;
  description: string;
  inStock: boolean;
  isActive: boolean;
  isi: { productId: number; qty: number }[];
};

/**
 * Formulir paket.
 *
 * Berbeda dari formulir produk biasa dalam satu hal penting: BERATNYA TIDAK
 * DIKETIK. Berat dihitung dari isi paket, di sini untuk ditampilkan dan
 * dihitung ulang di server saat menyimpan. Berat yang salah langsung jadi
 * ongkir yang salah, dan paket adalah barang yang paling gampang keliru
 * ditaksir beratnya.
 *
 * Harganya tetap diketik: potongan harga justru inti dari menjual paket.
 * Yang ditampilkan di samping harga adalah nilai isinya bila dibeli satuan,
 * supaya besaran potongannya kelihatan sebelum disimpan.
 */
export function PackageForm({ paket, calon }: { paket?: PaketAwal; calon: CalonIsi[] }) {
  const [state, action, pending] = useActionState(simpanPaketAksi, AWAL);

  const [nama, setNama] = useState(paket?.name ?? "");
  const [slug, setSlug] = useState(paket?.slug ?? "");
  const [slugDisentuh, setSlugDisentuh] = useState(Boolean(paket));
  const [harga, setHarga] = useState(String(paket?.price ?? ""));
  const [isi, setIsi] = useState<{ productId: number; qty: number }[]>(paket?.isi ?? []);

  const peta = new Map(calon.map((c) => [c.id, c]));
  const baris = isi.map((i) => ({ ...i, produk: peta.get(i.productId) }));

  const beratIsi = baris.reduce((n, b) => n + (b.produk?.weightGram ?? 0) * b.qty, 0);
  const hargaSatuan = baris.reduce((n, b) => n + (b.produk?.price ?? 0) * b.qty, 0);
  const hargaAngka = Number(harga);
  const hemat = hargaSatuan > 0 && hargaAngka > 0 ? hargaSatuan - hargaAngka : 0;

  const belumDipakai = calon.filter((c) => !isi.some((i) => i.productId === c.id));

  function tambahIsi(id: number) {
    if (!id || isi.some((i) => i.productId === id)) return;
    setIsi((p) => [...p, { productId: id, qty: 1 }]);
  }

  function ubahQty(id: number, qty: number) {
    setIsi((p) => p.map((i) => (i.productId === id ? { ...i, qty: Math.max(1, qty) } : i)));
  }

  function hapusIsi(id: number) {
    setIsi((p) => p.filter((i) => i.productId !== id));
  }

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {paket && <input type="hidden" name="id" value={paket.id} />}

      <div className="flex flex-col gap-5">
        {state.error && (
          <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2">
            {state.error}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Identitas</h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Nama paket</span>
            <input
              name="name"
              required
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (!slugDisentuh) setSlug(keSlug(e.target.value));
              }}
              className={kelasInput}
              placeholder="Paket Lebaran Hemat"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Slug URL</span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(e) => {
                setSlugDisentuh(true);
                setSlug(e.target.value);
              }}
              className={kelasInput}
            />
            <span className="text-xs text-muted">
              Alamatnya jadi <code className="rounded bg-sunken px-1 py-0.5">/produk/{slug || "…"}</code>.
            </span>
          </label>
        </section>

        {/* ── Isi paket ──────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 font-bold">Isi paket</h2>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Berat paket dihitung dari isi ini, jadi ongkirnya tidak perlu ditebak. Harganya tetap
            diisi tangan supaya potongan paket bisa ditentukan sendiri.
          </p>

          {baris.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-2 px-4 py-6 text-center text-sm text-muted">
              Belum ada isi. Tambahkan produk di bawah, atau isi berat paketnya sendiri di kolom
              cadangan.
            </p>
          ) : (
            <ul className="space-y-2">
              {baris.map((b) => (
                <li
                  key={b.productId}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3"
                >
                  <input type="hidden" name="isiProduk" value={b.productId} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {b.produk?.name ?? `Produk #${b.productId}`}
                    </p>
                    <p className="text-xs text-muted">
                      {b.produk
                        ? `${rupiah(b.produk.price)} · ${berat(b.produk.weightGram)}${
                            b.produk.inStock ? "" : " · stok habis"
                          }`
                        : "Produk sudah tidak ada"}
                    </p>
                  </div>

                  <label className="flex items-center gap-2">
                    <span className="text-xs text-muted">Jumlah</span>
                    <input
                      name="isiQty"
                      type="number"
                      min={1}
                      value={b.qty}
                      onChange={(e) => ubahQty(b.productId, Number(e.target.value))}
                      className="tabular w-20 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-jingga"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => hapusIsi(b.productId)}
                    className="rounded-lg border border-line-2 px-3 py-2 text-xs font-semibold transition hover:bg-sunken"
                  >
                    Keluarkan
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
            <select
              defaultValue=""
              onChange={(e) => {
                tambahIsi(Number(e.target.value));
                e.target.value = "";
              }}
              className={`${kelasInput} max-w-xs`}
              aria-label="Tambah produk ke paket"
            >
              <option value="">Tambah produk…</option>
              {belumDipakai.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {rupiah(c.price)}
                  {c.inStock ? "" : " (stok habis)"}
                </option>
              ))}
            </select>
          </div>

          {baris.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-sunken p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Berat total</dt>
                <dd className="tabular font-bold">{berat(beratIsi)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Nilai satuan</dt>
                <dd className="tabular font-bold">{rupiah(hargaSatuan)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Hemat</dt>
                <dd className={`tabular font-bold ${hemat > 0 ? "text-pandan" : "text-muted"}`}>
                  {hemat > 0 ? rupiah(hemat) : "—"}
                </dd>
              </div>
            </dl>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Deskripsi</h2>
          <textarea
            name="description"
            rows={6}
            defaultValue={paket?.description ?? ""}
            className={`${kelasInput} resize-y leading-relaxed`}
            placeholder={"Satu paragraf per baris.\nBaris kosong diabaikan."}
          />
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Harga</h2>

          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Harga paket (rupiah)</span>
            <input
              name="price"
              type="number"
              min={0}
              step={500}
              required
              value={harga}
              onChange={(e) => setHarga(e.target.value)}
              className={kelasInput}
              placeholder="160000"
            />
            <span className="text-xs text-muted">
              {Number.isFinite(hargaAngka) && hargaAngka > 0
                ? rupiah(hargaAngka)
                : "Tanpa titik atau koma."}
            </span>
          </label>

          {/* Kolom cadangan: hanya berlaku selama paket belum punya isi.
              Begitu ada isinya, server menghitung ulang beratnya sendiri
              dan angka di sini diabaikan. */}
          <label className="mt-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Berat cadangan (gram)</span>
            <input
              name="weightGram"
              type="number"
              min={0}
              step={10}
              defaultValue={paket && paket.isi.length === 0 ? paket.weightGram : ""}
              disabled={baris.length > 0}
              className={`${kelasInput} disabled:opacity-50`}
              placeholder="1000"
            />
            <span className="text-xs text-muted">
              {baris.length > 0
                ? `Tidak dipakai — berat diambil dari isi paket: ${berat(beratIsi)}.`
                : "Wajib diisi selama paket belum punya isi. Dipakai menghitung ongkir."}
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Penerbitan</h2>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={paket ? paket.isActive : true}
              className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
            />
            <span>
              <span className="block text-sm font-semibold">Tampilkan di toko</span>
              <span className="block text-xs text-muted">
                Kalau dimatikan, paket ini masuk arsip. Untuk menyembunyikan SELURUH paket
                sekaligus, matikan kategorinya di halaman Marketing.
              </span>
            </span>
          </label>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input
              type="checkbox"
              name="inStock"
              defaultChecked={paket ? paket.inStock : true}
              className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
            />
            <span>
              <span className="block text-sm font-semibold">Stok tersedia</span>
              <span className="block text-xs text-muted">
                Kalau dimatikan, paket tetap tampil tapi ditandai habis.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : paket ? "Simpan perubahan" : "Buat paket"}
          </button>
          <Link
            href="/admin/marketing"
            className="rounded-xl border border-line-2 px-5 py-3 text-center text-sm font-semibold transition hover:bg-sunken"
          >
            Batal
          </Link>
          {paket && (
            <Link
              href={`/produk/${paket.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pt-1 text-center text-xs text-muted underline underline-offset-2 hover:text-ink-2"
            >
              Lihat di toko ↗
            </Link>
          )}
        </div>
      </div>
    </form>
  );
}
