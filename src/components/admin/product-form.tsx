"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { simpanProduk, type FormState } from "@/app/admin/actions";
import type { AdminCategory, AdminProduct } from "@/lib/admin/products";
import { rupiah } from "@/lib/format";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

/** Slug otomatis dari nama, hanya saat membuat produk baru. */
function keSlug(teks: string) {
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm({
  produk,
  kategori,
  foto,
}: {
  produk?: AdminProduct;
  kategori: AdminCategory[];
  foto: { id: number; src: string; alt: string }[];
}) {
  const [state, action, pending] = useActionState(simpanProduk, AWAL);
  const [nama, setNama] = useState(produk?.name ?? "");
  const [slug, setSlug] = useState(produk?.slug ?? "");
  const [slugDisentuh, setSlugDisentuh] = useState(Boolean(produk));
  const [harga, setHarga] = useState(String(produk?.price ?? ""));

  const hargaAngka = Number(harga);

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {produk && <input type="hidden" name="id" value={produk.id} />}

      <div className="flex flex-col gap-5">
        {state.error && (
          <p
            role="alert"
            className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2"
          >
            {state.error}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Identitas</h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Nama produk</span>
            <input
              name="name"
              required
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (!slugDisentuh) setSlug(keSlug(e.target.value));
              }}
              className={kelasInput}
              placeholder="Dodol Betawi"
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
              {produk && " Mengubah slug memutus tautan lama yang sudah tersebar."}
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Harga &amp; berat</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={kelasLabel}>Harga (rupiah)</span>
              <input
                name="price"
                type="number"
                min={0}
                step={500}
                required
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                className={kelasInput}
                placeholder="19000"
              />
              <span className="text-xs text-muted">
                {Number.isFinite(hargaAngka) && hargaAngka > 0 ? rupiah(hargaAngka) : "Tanpa titik atau koma."}
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={kelasLabel}>Berat (gram)</span>
              <input
                name="weightGram"
                type="number"
                min={1}
                step={10}
                required
                defaultValue={produk?.weightGram ?? ""}
                className={kelasInput}
                placeholder="250"
              />
              <span className="text-xs text-muted">
                Dipakai menghitung ongkir. Isi berat kirim, termasuk kemasan.
              </span>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Deskripsi</h2>
          <textarea
            name="description"
            rows={7}
            defaultValue={produk?.description ?? ""}
            className={`${kelasInput} resize-y leading-relaxed`}
            placeholder={"Satu paragraf per baris.\nBaris kosong diabaikan."}
          />
          <p className="mt-2 text-xs text-muted">Setiap baris tampil sebagai paragraf terpisah di halaman produk.</p>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Penerbitan</h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Kategori</span>
            <select name="categoryId" defaultValue={produk?.categoryId ?? ""} className={kelasInput}>
              <option value="">Tanpa kategori</option>
              {kategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={produk ? produk.isActive : true}
              className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
            />
            <span>
              <span className="block text-sm font-semibold">Tampilkan di toko</span>
              <span className="block text-xs text-muted">Kalau dimatikan, produk masuk arsip.</span>
            </span>
          </label>

          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3.5">
            <input
              type="checkbox"
              name="inStock"
              defaultChecked={produk ? produk.inStock : true}
              className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
            />
            <span>
              <span className="block text-sm font-semibold">Stok tersedia</span>
              <span className="block text-xs text-muted">
                Kalau dimatikan, produk tetap tampil tapi ditandai habis.
              </span>
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 font-bold">Foto</h2>
          <p className="mb-4 text-xs text-muted">
            {foto.length > 0 ? `${foto.length} foto terpasang.` : "Belum ada foto."} Unggah foto belum tersedia
            di panel — berkasnya masih dari hasil migrasi di <code className="rounded bg-sunken px-1">public/produk/</code>.
          </p>
          {foto.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {foto.map((f) => (
                <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg bg-sunken">
                  <Image src={f.src} alt={f.alt} fill sizes="90px" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-5 shadow-card">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : produk ? "Simpan perubahan" : "Buat produk"}
          </button>
          <Link
            href="/admin/produk"
            className="rounded-xl border border-line-2 px-5 py-3 text-center text-sm font-semibold transition hover:bg-sunken"
          >
            Batal
          </Link>
          {produk && (
            <Link
              href={`/produk/${produk.slug}`}
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
