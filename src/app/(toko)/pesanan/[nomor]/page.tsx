import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@/data/site";
import { berat, rupiah } from "@/lib/format";
import { labelStatus, LABEL_STATUS, STATUS_URUT } from "@/lib/order-status";
import { getBarisPesanan, getPesananByNomor } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status pesanan",
  // Halaman ini memuat nama dan alamat pembeli — jangan sampai terindeks.
  robots: { index: false, follow: false },
};

export default async function StatusPesanan({ params }: { params: Promise<{ nomor: string }> }) {
  const { nomor } = await params;
  const pesanan = await getPesananByNomor(nomor);
  if (!pesanan) notFound();

  const barang = await getBarisPesanan(pesanan.id);
  const langkah = STATUS_URUT.indexOf(pesanan.status as (typeof STATUS_URUT)[number]);
  const batal = langkah === -1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-xs font-semibold tracking-widest text-muted uppercase">Nomor pesanan</p>
      <h1 className="font-display tabular mt-1 text-3xl font-extrabold tracking-tight">
        {pesanan.order_number}
      </h1>
      <p className="mt-2 text-sm text-ink-2">
        Dibuat {new Date(pesanan.created_at).toLocaleString("id-ID")}
      </p>

      {/* Jejak status */}
      <div className="mt-7 rounded-2xl border border-line bg-surface p-5">
        <p className={`font-display text-lg font-bold ${batal ? "text-jingga" : "text-pandan"}`}>
          {labelStatus(pesanan.status)}
        </p>
        {!batal && (
          <ol className="mt-4 flex flex-wrap gap-1.5">
            {STATUS_URUT.map((s, i) => (
              <li
                key={s}
                className={`flex-1 rounded-full py-1 text-center text-[10px] font-semibold ${
                  i <= langkah ? "bg-pandan text-pandan-ink" : "bg-sunken text-muted"
                }`}
                title={LABEL_STATUS[s]}
              >
                {i <= langkah ? "✓" : i + 1}
              </li>
            ))}
          </ol>
        )}
        {pesanan.tracking_number && (
          <p className="mt-4 text-sm">
            Nomor resi: <b className="tabular">{pesanan.tracking_number}</b>
          </p>
        )}
      </div>

      {/* Barang */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {barang.map((b, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
              <span>
                <span className="font-medium">{b.name}</span>
                <span className="block text-xs text-muted">
                  {b.qty} × {rupiah(Number(b.unit_price))} · {berat(Number(b.weight_gram))}
                </span>
              </span>
              <span className="tabular shrink-0 font-semibold">
                {rupiah(Number(b.unit_price) * b.qty)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="grid grid-cols-[1fr_auto] gap-2 border-t border-line bg-sunken px-5 py-4 text-sm">
          <dt className="text-ink-2">Subtotal · {berat(Number(pesanan.weight_gram))}</dt>
          <dd className="tabular text-right">{rupiah(Number(pesanan.subtotal))}</dd>
          <dt className="text-ink-2">
            {pesanan.courier} {pesanan.courier_service !== pesanan.courier && pesanan.courier_service}
            {pesanan.etd && <span className="text-muted"> · {pesanan.etd}</span>}
          </dt>
          <dd className="tabular text-right">
            {Number(pesanan.shipping_cost) === 0 ? "Gratis" : rupiah(Number(pesanan.shipping_cost))}
          </dd>
          <dt className="border-t border-line pt-2 font-bold">Total</dt>
          <dd className="tabular border-t border-line pt-2 text-right font-bold">
            {rupiah(Number(pesanan.total))}
          </dd>
        </dl>
      </div>

      {/* Tujuan */}
      <div className="mt-5 rounded-2xl border border-line bg-surface p-5 text-sm">
        <p className="text-xs font-semibold tracking-widest text-muted uppercase">Dikirim ke</p>
        <p className="mt-2 font-medium">{pesanan.customer_name}</p>
        {pesanan.address && <p className="text-ink-2">{pesanan.address}</p>}
        {pesanan.destination_label && <p className="text-ink-2">{pesanan.destination_label}</p>}
      </div>

      <a
        href={`https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(
          `Halo Romlah, saya mau tanya soal pesanan ${pesanan.order_number}`,
        )}`}
        className="mt-5 block rounded-xl border border-pandan px-6 py-3.5 text-center text-sm font-semibold text-pandan transition hover:bg-pandan-soft"
      >
        Tanya lewat WhatsApp
      </a>
      <Link href="/katalog" className="mt-4 block text-center text-xs text-muted underline underline-offset-2">
        Belanja lagi
      </Link>
    </div>
  );
}
