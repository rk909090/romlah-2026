import type { Metadata } from "next";
import { WaButton } from "@/components/wa-button";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Toko & jam buka",
  description: `Alamat dan jam buka outlet ${SITE.name} di Jakarta, plus toko resmi kami di Tokopedia. Pesanan juga bisa diambil sendiri tanpa ongkir.`,
};

export default function Toko() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Toko kami</h1>
      <p className="mt-3 max-w-lg text-ink-2">
        Pesanan dari website bisa diambil sendiri di outlet Tanjung Barat tanpa biaya kirim.
      </p>

      <ul className="mt-8 space-y-4">
        {/* Outlet fisik */}
        {SITE.outlets.map((o) => (
          <li
            key={o.name}
            className={`rounded-2xl border p-5 ${
              o.isOpen ? "border-line bg-surface" : "border-line bg-sunken opacity-70"
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-lg font-bold">{o.name}</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  o.isOpen ? "bg-pandan-soft text-pandan" : "bg-line text-muted"
                }`}
              >
                {o.isOpen ? "Buka" : "Tutup sementara"}
              </span>
            </div>
            <p className="mt-2 text-sm text-ink-2">{o.address}</p>
            <p className="mt-1 text-sm text-muted">{o.hours}</p>

            <a
              href={SITE.maps}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-4 py-2 text-xs font-semibold transition hover:bg-sunken"
            >
              Lihat di Google Maps ↗
            </a>
          </li>
        ))}

        {/* Toko daring. Ditaruh sebagai toko kedua supaya pembeli di luar
            Jakarta punya jalur belanja yang jelas, bukan cuma alamat gerai. */}
        <li className="rounded-2xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-lg font-bold">Romlah di Tokopedia</h2>
            <span className="rounded-full bg-pandan-soft px-2.5 py-1 text-[11px] font-semibold text-pandan">
              Toko daring
            </span>
          </div>
          <p className="mt-2 text-sm text-ink-2">Toko resmi kami di Tokopedia — buka 24 jam.</p>
          <p className="mt-1 text-sm text-muted">
            Belanja di sini juga bisa, dan pesanannya langsung masuk ke kami.
          </p>

          <a
            href={SITE.marketplace.tokopedia}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line-2 px-4 py-2 text-xs font-semibold transition hover:bg-sunken"
          >
            Buka toko Tokopedia ↗
          </a>
        </li>
      </ul>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={SITE.maps}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110"
        >
          Buka di Google Maps ↗
        </a>
        <WaButton lebar="inline">WhatsApp {SITE.whatsapp.display}</WaButton>
      </div>
    </div>
  );
}
