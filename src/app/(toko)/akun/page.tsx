import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { keluarPelanggan } from "@/app/(toko)/akun-actions";
import { WaButton } from "@/components/wa-button";
import { getPelangganSaatIni, getPesananPelanggan, getRingkasanPelanggan } from "@/lib/akun";
import { getCustomerAddresses } from "@/lib/admin/customers";
import { rupiah } from "@/lib/format";
import { labelStatus, STATUS_BATAL } from "@/lib/order-status";
import { tampilkanTelepon } from "@/lib/telepon";

export const metadata: Metadata = {
  title: "Akun saya",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const WARNA: Record<string, string> = {
  menunggu_konfirmasi: "bg-warn-soft text-warn",
  menunggu_bayar: "bg-jingga-soft text-jingga",
  dibayar: "bg-pandan-soft text-pandan",
  diproses: "bg-pandan-soft text-pandan",
  dikirim: "bg-pandan-soft text-pandan",
  selesai: "bg-pandan-soft text-pandan",
};

/** Waktu tersimpan UTC; ditampilkan dalam jam toko. */
const waktu = (v: string) =>
  new Date(v).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default async function Akun() {
  const pelanggan = await getPelangganSaatIni();
  if (!pelanggan) redirect("/akun/masuk");

  const [pesanan, ringkas, alamat] = await Promise.all([
    getPesananPelanggan(pelanggan.id),
    getRingkasanPelanggan(pelanggan.id),
    getCustomerAddresses(pelanggan.id),
  ]);

  const jadi = pesanan.filter((p) => !(STATUS_BATAL as readonly string[]).includes(p.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            Halo, {pelanggan.name.split(" ")[0]}
          </h1>
          <p className="tabular mt-1 text-sm text-ink-2">{tampilkanTelepon(pelanggan.phone)}</p>
          {pelanggan.email && <p className="text-sm text-ink-2">{pelanggan.email}</p>}
        </div>

        <form action={keluarPelanggan}>
          <button
            type="submit"
            className="rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
          >
            Keluar
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Pesanan", nilai: String(ringkas.pesanan) },
          { label: "Total belanja", nilai: rupiah(ringkas.belanja), catatan: "Di luar pesanan batal" },
          {
            label: "Terakhir pesan",
            nilai: ringkas.terakhir
              ? new Date(ringkas.terakhir).toLocaleDateString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—",
          },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">{k.label}</p>
            <p className="tabular mt-1 text-xl font-extrabold">{k.nilai}</p>
            {k.catatan && <p className="mt-0.5 text-xs text-muted">{k.catatan}</p>}
          </div>
        ))}
      </div>

      {/* ── Riwayat pesanan ─────────────────────────────────────────── */}
      <h2 className="font-display mt-8 mb-3 text-xl font-extrabold">
        Riwayat pesanan {pesanan.length > 0 && <span className="text-muted">({pesanan.length})</span>}
      </h2>

      {pesanan.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center">
          <p className="font-display text-lg font-bold">Belum ada pesanan</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-2">
            Pesanan yang Anda buat lewat website maupun WhatsApp akan muncul di sini.
          </p>
          <Link
            href="/katalog"
            className="mt-5 inline-block rounded-xl bg-jingga px-5 py-3 text-sm font-semibold text-jingga-ink"
          >
            Mulai belanja
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {pesanan.map((p) => (
            <li key={p.order_number} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/pesanan/${p.order_number}`}
                      className="tabular font-display font-bold hover:text-jingga"
                    >
                      {p.order_number}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                        WARNA[p.status] ?? "bg-sunken text-muted"
                      }`}
                    >
                      {labelStatus(p.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{waktu(p.created_at)}</p>
                  <p className="mt-0.5 text-xs text-ink-2">
                    {Number(p.jumlahBarang)} barang
                    {p.courier && (
                      <>
                        {" · "}
                        {p.courier} {p.courier_service !== p.courier && p.courier_service}
                      </>
                    )}
                    {p.promo_code && <> · promo {p.promo_code}</>}
                  </p>
                  {p.tracking_number && (
                    <p className="tabular mt-1 text-xs font-medium text-pandan">
                      Resi: {p.tracking_number}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="tabular font-bold">{rupiah(Number(p.total))}</p>
                  <Link
                    href={`/pesanan/${p.order_number}`}
                    className="mt-1 inline-block text-xs font-medium text-jingga hover:underline"
                  >
                    Lihat rincian →
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ── Alamat tersimpan ────────────────────────────────────────── */}
      {alamat.length > 0 && (
        <>
          <h2 className="font-display mt-8 mb-3 text-xl font-extrabold">
            Alamat tersimpan <span className="text-muted">({alamat.length})</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {alamat.map((a) => (
              <li key={a.id} className="rounded-2xl border border-line bg-surface p-4 text-sm">
                <p className="font-semibold">{a.recipient_name}</p>
                <p className="tabular text-xs text-muted">{tampilkanTelepon(a.phone)}</p>
                <p className="mt-1.5 leading-relaxed text-ink-2">{a.address}</p>
                {a.destination_label && <p className="mt-0.5 text-xs text-muted">{a.destination_label}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Alamat tersimpan sendiri dari pesanan sebelumnya. Menyuntingnya dari sini belum tersedia —
            alamat baru cukup diketik saat memesan.
          </p>
        </>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-sunken p-5 text-center">
        <p className="text-sm leading-relaxed text-ink-2">
          Ada yang mau ditanyakan soal pesanan Anda?
        </p>
        <div className="mx-auto mt-3 max-w-xs">
          <WaButton
            pesan={`Halo Romlah, saya mau tanya soal pesanan saya (${pelanggan.name}, ${tampilkanTelepon(pelanggan.phone)})`}
            sumber="pesanan"
          >
            Tanya lewat WhatsApp
          </WaButton>
        </div>
        {jadi.length !== pesanan.length && (
          <p className="mt-3 text-xs text-muted">
            {pesanan.length - jadi.length} pesanan berstatus batal atau kedaluwarsa tidak dihitung
            dalam total belanja.
          </p>
        )}
      </div>
    </div>
  );
}
