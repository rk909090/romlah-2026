"use client";

import { useActionState, useState } from "react";
import {
  simpanBanner,
  simpanCheckout,
  simpanGratisOngkir,
  type FormState,
} from "@/app/admin/actions";
import { rupiah } from "@/lib/format";
import type { Banner, Checkout, GratisOngkir } from "@/lib/settings";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

function Pesan({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-xl border border-pandan/40 bg-pandan-soft px-4 py-3 text-sm text-ink-2">
        {state.ok}
      </p>
    );
  return null;
}

function Simpan({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : "Simpan"}
    </button>
  );
}

/** Sakelar besar berbentuk kartu, dipakai di setiap pengaturan program. */
function Sakelar({
  nama,
  aktifAwal,
  judul,
  keterangan,
  onChange,
}: {
  nama: string;
  aktifAwal: boolean;
  judul: string;
  keterangan: string;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4">
      <input
        type="checkbox"
        name={nama}
        defaultChecked={aktifAwal}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--jingga)]"
      />
      <span>
        <span className="block text-sm font-semibold">{judul}</span>
        <span className="block text-xs leading-relaxed text-muted">{keterangan}</span>
      </span>
    </label>
  );
}

/* ── Gratis ongkir ───────────────────────────────────────────────────── */

export function FormGratisOngkir({ nilai }: { nilai: GratisOngkir }) {
  const [state, action, pending] = useActionState(simpanGratisOngkir, AWAL);
  const [aktif, setAktif] = useState(nilai.aktif);
  const [min, setMin] = useState(String(nilai.minBelanja));
  const [maks, setMaks] = useState(String(nilai.maksPotongan));

  const minAngka = Number(min);
  const maksAngka = Number(maks);
  const gratisSemua = aktif && minAngka === 0;

  return (
    <form action={action} className="flex flex-col gap-5">
      <Pesan state={state} />

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <Sakelar
          nama="aktif"
          aktifAwal={nilai.aktif}
          onChange={setAktif}
          judul="Nyalakan program gratis ongkir"
          keterangan="Saat mati, seluruh pesanan membayar ongkir penuh dan ajakan di keranjang ikut hilang."
        />

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Minimal belanja (rupiah)</span>
            <input
              name="minBelanja"
              type="number"
              min={0}
              step={5000}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              className={kelasInput}
              placeholder="250000"
            />
            <span className="text-xs text-muted">
              {Number.isFinite(minAngka) && minAngka > 0
                ? `Gratis ongkir mulai ${rupiah(minAngka)}. Dihitung dari subtotal barang, di luar ongkir.`
                : "0 berarti semua pesanan gratis ongkir."}
            </span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={kelasLabel}>Batas potongan (rupiah)</span>
            <input
              name="maksPotongan"
              type="number"
              min={0}
              step={5000}
              value={maks}
              onChange={(e) => setMaks(e.target.value)}
              className={kelasInput}
              placeholder="0"
            />
            <span className="text-xs leading-relaxed text-muted">
              {Number.isFinite(maksAngka) && maksAngka > 0
                ? `Toko menanggung maksimal ${rupiah(maksAngka)}; selebihnya dibayar pembeli.`
                : "0 = tanpa batas, toko menanggung seluruh ongkirnya."}
            </span>
          </label>
        </div>

        {maksAngka === 0 && aktif && (
          <p className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-xs leading-relaxed text-warn">
            Tanpa batas potongan, kiriman ke luar Jawa ditanggung penuh berapa pun ongkirnya. Kirim
            2 kg ke Papua bisa jauh lebih mahal daripada marginnya — pertimbangkan mengisi batas.
          </p>
        )}

        {gratisSemua && (
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-jingga/40 bg-jingga-soft p-4">
            <input type="checkbox" name="sadarGratisSemua" className="mt-0.5 h-4 w-4 accent-[var(--jingga)]" />
            <span className="text-xs leading-relaxed text-ink-2">
              Saya paham minimal belanja <b>0</b> berarti <b>semua</b> pesanan gratis ongkir, tanpa
              syarat nilai belanja.
            </span>
          </label>
        )}

        <label className="mt-5 flex flex-col gap-1.5">
          <span className={kelasLabel}>Kalimat di keranjang (opsional)</span>
          <input
            name="pesan"
            defaultValue={nilai.pesan}
            maxLength={200}
            className={kelasInput}
            placeholder="Kosongkan untuk memakai kalimat bawaan"
          />
          <span className="text-xs text-muted">
            Bawaannya: “Tambah {rupiah(Math.max(0, minAngka || 0))} lagi untuk gratis ongkir”.
          </span>
        </label>
      </section>

      <div>
        <Simpan pending={pending} />
      </div>
    </form>
  );
}

/* ── Tombol checkout ─────────────────────────────────────────────────── */

export function FormCheckout({
  nilai,
  bayarAktif,
}: {
  nilai: Checkout;
  /** Midtrans siap dipakai. Kalau tidak, tombol WhatsApp tidak boleh dimatikan. */
  bayarAktif: boolean;
}) {
  const [state, action, pending] = useActionState(simpanCheckout, AWAL);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Pesan state={state} />

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <Sakelar
          nama="tombolWa"
          aktifAwal={nilai.tombolWa}
          judul="Tampilkan tombol “Pesan lewat WhatsApp” di keranjang"
          keterangan="Saat mati, pembeli hanya punya satu jalan keluar: bayar sekarang lewat Midtrans."
        />

        {!bayarAktif && (
          <p className="mt-4 rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-xs leading-relaxed text-ink-2">
            <b>Midtrans belum aktif di server ini.</b> Selama itu, tombol WhatsApp tetap ditampilkan
            di keranjang apa pun isi pengaturan ini — tanpa itu tidak ada satu pun cara memesan, dan
            keranjang jadi jalan buntu. Pengaturannya tetap tersimpan dan langsung berlaku begitu
            kunci Midtrans terpasang.
          </p>
        )}

        <p className="mt-4 text-xs leading-relaxed text-muted">
          Mematikan tombol ini mendorong pembeli membayar langsung, tapi juga menutup kanal terbesar
          Romlah. Perhatikan angka di <b>Pesanan</b>: kalau jumlah pesanan turun setelah ini
          dimatikan, nyalakan lagi.
        </p>
      </section>

      <div>
        <Simpan pending={pending} />
      </div>
    </form>
  );
}

/* ── Banner pengumuman ───────────────────────────────────────────────── */

export function FormBanner({ nilai }: { nilai: Banner }) {
  const [state, action, pending] = useActionState(simpanBanner, AWAL);
  const [teks, setTeks] = useState(nilai.teks);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Pesan state={state} />

      <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
        <Sakelar
          nama="aktif"
          aktifAwal={nilai.aktif}
          judul="Tampilkan banner di seluruh halaman toko"
          keterangan="Muncul sebagai satu baris tipis di paling atas, di atas menu."
        />

        <label className="mt-5 flex flex-col gap-1.5">
          <span className={kelasLabel}>Teks pengumuman</span>
          <input
            name="teks"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            maxLength={200}
            className={kelasInput}
            placeholder="Gratis ongkir untuk belanja mulai Rp 250.000"
          />
          <span className="text-xs text-muted">{teks.length}/200 karakter</span>
        </label>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className={kelasLabel}>Tautan (opsional)</span>
          <input
            name="tautan"
            defaultValue={nilai.tautan}
            maxLength={255}
            className={kelasInput}
            placeholder="/katalog?kategori=paket"
          />
          <span className="text-xs text-muted">
            Diawali <code className="rounded bg-sunken px-1">/</code> untuk halaman dalam situs, atau
            alamat lengkap berawalan http:// maupun https://. Kosongkan supaya banner tidak bisa diklik.
          </span>
        </label>

        {teks && (
          <div className="mt-5">
            <p className={kelasLabel}>Pratinjau</p>
            <div className="mt-1.5 rounded-xl bg-ink px-4 py-2.5 text-center text-xs font-medium text-bg">
              {teks}
            </div>
          </div>
        )}
      </section>

      <div>
        <Simpan pending={pending} />
      </div>
    </form>
  );
}
