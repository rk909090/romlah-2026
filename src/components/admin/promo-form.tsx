"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { simpanPromoAksi, type FormState } from "@/app/admin/actions";
import { rupiah } from "@/lib/format";
import { hitungPromo, JENIS_PROMO, LABEL_JENIS, type JenisPromo } from "@/lib/promo-kode";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

export type PromoAwal = {
  id: number;
  code: string;
  description: string | null;
  jenis: JenisPromo;
  nilai: number;
  minBelanja: number;
  maksPotongan: number;
  kuota: number | null;
  terpakai: number;
  kuotaPerOrang: number | null;
  mulai: string | null;
  berakhir: string | null;
  isActive: boolean;
};

/** DATETIME dari basis data (UTC) jadi nilai untuk <input type="datetime-local"> dalam WIB. */
function keInputWaktu(v: string | null): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  // sv-SE memberi "YYYY-MM-DD HH:MM:SS"; input butuh "T" di tengah.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  })
    .format(d)
    .replace(" ", "T");
}

export function PromoForm({ promo }: { promo?: PromoAwal }) {
  const [state, action, pending] = useActionState(simpanPromoAksi, AWAL);

  const [kode, setKode] = useState(promo?.code ?? "");
  const [jenis, setJenis] = useState<JenisPromo>(promo?.jenis ?? "nominal");
  const [nilai, setNilai] = useState(String(promo?.nilai ?? ""));
  const [minBelanja, setMinBelanja] = useState(String(promo?.minBelanja ?? 0));
  const [maks, setMaks] = useState(String(promo?.maksPotongan ?? 0));

  const n = Number(nilai) || 0;
  const min = Number(minBelanja) || 0;
  const mk = Number(maks) || 0;

  // Contoh perhitungan memakai fungsi yang sama persis dengan yang dipakai
  // keranjang dan penyimpan pesanan, jadi angkanya bukan ilustrasi kosong.
  const contohSubtotal = Math.max(min, 200_000);
  const contohOngkir = 20_000;
  const contoh = hitungPromo(
    { code: kode, jenis, nilai: n, minBelanja: min, maksPotongan: mk },
    contohSubtotal,
    contohOngkir,
  );

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      {promo && <input type="hidden" name="id" value={promo.id} />}

      <div className="flex flex-col gap-5">
        {state.error && (
          <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2">
            {state.error}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Kode</h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Kode promo</span>
            <input
              name="code"
              required
              value={kode}
              onChange={(e) => setKode(e.target.value.toUpperCase())}
              maxLength={40}
              autoCapitalize="characters"
              className={`${kelasInput} tabular font-semibold uppercase`}
              placeholder="LEBARAN25"
            />
            <span className="text-xs text-muted">
              Huruf, angka, dan tanda hubung. Pembeli boleh mengetiknya huruf kecil.
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Keterangan (untuk admin)</span>
            <input
              name="description"
              defaultValue={promo?.description ?? ""}
              maxLength={255}
              className={kelasInput}
              placeholder="Promo Lebaran 2026, dibagikan di Instagram"
            />
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Potongan</h2>

          <div className="grid gap-2">
            {JENIS_PROMO.map((j) => (
              <label
                key={j}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                  jenis === j ? "border-jingga bg-jingga-soft" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="jenis"
                  value={j}
                  checked={jenis === j}
                  onChange={() => setJenis(j)}
                  className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
                />
                <span className="text-sm font-medium">{LABEL_JENIS[j]}</span>
              </label>
            ))}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={kelasLabel}>
                {jenis === "persen" ? "Besar potongan (persen)" : "Besar potongan (rupiah)"}
              </span>
              <input
                name="nilai"
                type="number"
                min={0}
                max={jenis === "persen" ? 100 : undefined}
                step={jenis === "persen" ? 1 : 1000}
                required
                value={nilai}
                onChange={(e) => setNilai(e.target.value)}
                className={kelasInput}
                placeholder={jenis === "persen" ? "10" : "25000"}
              />
              <span className="text-xs leading-relaxed text-muted">
                {jenis === "persen"
                  ? "1–100. Wajib dipasangkan dengan batas potongan."
                  : jenis === "ongkir"
                    ? "0 berarti seluruh ongkir yang tersisa ditanggung."
                    : "Dipotong dari subtotal barang."}
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={kelasLabel}>Batas potongan (rupiah)</span>
              <input
                name="maksPotongan"
                type="number"
                min={0}
                step={1000}
                value={maks}
                onChange={(e) => setMaks(e.target.value)}
                className={kelasInput}
                placeholder="0"
              />
              <span className="text-xs text-muted">0 = tanpa batas.</span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className={kelasLabel}>Minimal belanja (rupiah)</span>
              <input
                name="minBelanja"
                type="number"
                min={0}
                step={5000}
                value={minBelanja}
                onChange={(e) => setMinBelanja(e.target.value)}
                className={kelasInput}
                placeholder="0"
              />
              <span className="text-xs text-muted">Dihitung dari subtotal barang, di luar ongkir.</span>
            </label>
          </div>

          <div className="mt-5 rounded-xl bg-sunken p-4 text-sm">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Contoh hitungan</p>
            <p className="mt-1.5 leading-relaxed text-ink-2">
              Belanja {rupiah(contohSubtotal)} dengan ongkir {rupiah(contohOngkir)} →{" "}
              {contoh.total > 0 ? (
                <b className="text-pandan">potongan {rupiah(contoh.total)}</b>
              ) : (
                <b>tidak ada potongan</b>
              )}
              {contoh.diskonOngkir > 0 && " (dari ongkirnya)"}
            </p>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-5">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Batasan</h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Kuota total</span>
            <input
              name="kuota"
              type="number"
              min={0}
              defaultValue={promo?.kuota ?? ""}
              className={kelasInput}
              placeholder="Kosongkan = tanpa batas"
            />
            {promo && (
              <span className="text-xs text-muted">
                Sudah terpakai {promo.terpakai} kali.
                {promo.kuota !== null && ` Sisa ${Math.max(0, promo.kuota - promo.terpakai)}.`}
              </span>
            )}
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Kuota per pelanggan</span>
            <input
              name="kuotaPerOrang"
              type="number"
              min={0}
              defaultValue={promo?.kuotaPerOrang ?? ""}
              className={kelasInput}
              placeholder="Kosongkan = tanpa batas"
            />
            <span className="text-xs text-muted">Dihitung dari nomor WhatsApp pembeli.</span>
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className={kelasLabel}>Mulai berlaku</span>
            <input
              name="mulai"
              type="datetime-local"
              defaultValue={keInputWaktu(promo?.mulai ?? null)}
              className={kelasInput}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Berakhir</span>
            <input
              name="berakhir"
              type="datetime-local"
              defaultValue={keInputWaktu(promo?.berakhir ?? null)}
              className={kelasInput}
            />
            <span className="text-xs text-muted">
              Waktu WIB. Kosongkan keduanya kalau berlaku terus.
            </span>
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={promo ? promo.isActive : true}
              className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
            />
            <span>
              <span className="block text-sm font-semibold">Kode aktif</span>
              <span className="block text-xs text-muted">
                Kalau dimatikan, kodenya langsung ditolak di keranjang.
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
            {pending ? "Menyimpan…" : promo ? "Simpan perubahan" : "Buat kode"}
          </button>
          <Link
            href="/admin/marketing/promo"
            className="rounded-xl border border-line-2 px-5 py-3 text-center text-sm font-semibold transition hover:bg-sunken"
          >
            Batal
          </Link>
        </div>
      </div>
    </form>
  );
}
