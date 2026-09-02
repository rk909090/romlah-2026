"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { aturSandiPelanggan, masukPelanggan, type FormAkun } from "@/app/(toko)/akun-actions";
import { MAKS_DIGIT_TELEPON, saringAngka } from "@/lib/telepon";

const AWAL: FormAkun = {};

const kelasInput =
  "mt-1.5 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "text-xs font-semibold tracking-wide text-muted uppercase";

function Galat({ state }: { state: FormAkun }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm leading-relaxed text-ink-2">
      {state.error}
    </p>
  );
}

/**
 * Masuk akun pelanggan, beserta jalur menetapkan kata sandi.
 *
 * Keduanya di satu layar dengan sakelar, bukan dua halaman: pelanggan yang
 * gagal masuk karena belum punya sandi harus bisa langsung membuatnya tanpa
 * kehilangan apa yang sudah diketik.
 */
export function FormAkunMasuk() {
  const [mode, setMode] = useState<"masuk" | "sandi">("masuk");
  const [telepon, setTelepon] = useState("");

  const [sMasuk, aksiMasuk, pendingMasuk] = useActionState(masukPelanggan, AWAL);
  const [sSandi, aksiSandi, pendingSandi] = useActionState(aturSandiPelanggan, AWAL);

  const kolomTelepon = (
    <label className="block">
      <span className={kelasLabel}>Nomor WhatsApp</span>
      <input
        name="telepon"
        required
        value={telepon}
        onChange={(e) => setTelepon(saringAngka(e.target.value))}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={MAKS_DIGIT_TELEPON}
        autoComplete="tel"
        placeholder="08…"
        className={kelasInput}
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-5 flex rounded-xl border border-line bg-surface p-1">
        {(
          [
            ["masuk", "Masuk"],
            ["sandi", "Buat / lupa sandi"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            aria-pressed={mode === k}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              mode === k ? "bg-ink text-bg" : "text-ink-2 hover:bg-sunken"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "masuk" ? (
        <form action={aksiMasuk} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <Galat state={sMasuk} />
          {kolomTelepon}

          <label className="block">
            <span className={kelasLabel}>Kata sandi</span>
            <input
              name="sandi"
              type="password"
              required
              autoComplete="current-password"
              className={kelasInput}
            />
          </label>

          <button
            type="submit"
            disabled={pendingMasuk}
            className="mt-1 rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110 disabled:opacity-60"
          >
            {pendingMasuk ? "Memeriksa…" : "Masuk"}
          </button>

          <button
            type="button"
            onClick={() => setMode("sandi")}
            className="text-center text-xs font-medium text-jingga hover:underline"
          >
            Belum punya sandi, atau lupa?
          </button>
        </form>
      ) : (
        <form action={aksiSandi} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <Galat state={sSandi} />

          <p className="rounded-xl bg-sunken px-4 py-3 text-xs leading-relaxed text-ink-2">
            Belum ada pendaftaran terpisah — akun Anda sudah terbentuk sejak pesanan pertama. Untuk
            membuat kata sandinya, masukkan <b>salah satu nomor pesanan</b> Anda sebagai bukti.
            Nomornya berbentuk <code className="rounded bg-bg px-1">RML-260902-XXXXX</code> dan ada
            di pesan WhatsApp maupun halaman status pesanan.
          </p>

          {kolomTelepon}

          <label className="block">
            <span className={kelasLabel}>Nomor pesanan</span>
            <input
              name="nomorPesanan"
              required
              autoCapitalize="characters"
              placeholder="RML-260902-XXXXX"
              className={`${kelasInput} tabular uppercase`}
            />
          </label>

          <label className="block">
            <span className={kelasLabel}>Kata sandi baru</span>
            <input
              name="sandi"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={kelasInput}
            />
            <span className="mt-1 block text-xs text-muted">Minimal 8 karakter.</span>
          </label>

          <label className="block">
            <span className={kelasLabel}>Ulangi kata sandi</span>
            <input
              name="sandi2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={kelasInput}
            />
          </label>

          <button
            type="submit"
            disabled={pendingSandi}
            className="mt-1 rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110 disabled:opacity-60"
          >
            {pendingSandi ? "Menyimpan…" : "Simpan kata sandi & masuk"}
          </button>

          <p className="text-center text-xs leading-relaxed text-muted">
            Tidak ingat nomor pesanan Anda?{" "}
            <Link href="/" className="font-medium text-jingga hover:underline">
              Hubungi kami lewat WhatsApp
            </Link>{" "}
            — nomornya bisa kami carikan.
          </p>
        </form>
      )}
    </div>
  );
}
