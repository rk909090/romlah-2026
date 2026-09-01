import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/admin-shell";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { SITE } from "@/data/site";
import { tampilkanTelepon } from "@/lib/admin/customers";
import { berat, rupiah } from "@/lib/format";
import { getBarisPesanan, getPesananById } from "@/lib/orders";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await getPesananById(Number(id));
  return { title: p ? p.order_number : "Pesanan tidak ditemukan" };
}

export default async function DetailPesanan({ params }: Props) {
  const { id } = await params;
  const idAngka = Number(id);
  if (!Number.isInteger(idAngka)) notFound();

  const pesanan = await getPesananById(idAngka);
  if (!pesanan) notFound();

  const barang = await getBarisPesanan(pesanan.id);
  const waBalas = `https://wa.me/${pesanan.customer_phone}?text=${encodeURIComponent(
    `Halo ${pesanan.customer_name}, pesanan ${pesanan.order_number} sudah kami terima.`,
  )}`;

  return (
    <>
      <AdminHeading
        title={pesanan.order_number}
        description={`Masuk lewat ${pesanan.channel} · ${new Date(pesanan.created_at).toLocaleString("id-ID")}`}
        action={
          <Link
            href="/admin/pesanan"
            className="rounded-xl border border-line-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-sunken"
          >
            ← Semua pesanan
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="flex flex-col gap-5">
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <h2 className="font-display border-b border-line px-5 py-4 font-bold">Barang</h2>
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
                {pesanan.courier} {pesanan.courier_service}
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
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card text-sm">
            <h2 className="font-display mb-3 font-bold">Penerima</h2>
            <p className="font-medium">{pesanan.customer_name}</p>
            <p className="tabular text-ink-2">{tampilkanTelepon(pesanan.customer_phone)}</p>
            {pesanan.address && <p className="mt-2 text-ink-2">{pesanan.address}</p>}
            {pesanan.destination_label && <p className="text-ink-2">{pesanan.destination_label}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={waBalas}
                className="rounded-lg border border-pandan px-4 py-2 text-xs font-semibold text-pandan transition hover:bg-pandan-soft"
              >
                Balas di WhatsApp
              </a>
              <Link
                href={`/pesanan/${pesanan.order_number}`}
                className="rounded-lg border border-line-2 px-4 py-2 text-xs font-semibold transition hover:bg-sunken"
              >
                Halaman status pembeli ↗
              </Link>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-4 font-bold">Perbarui</h2>
          <OrderStatusForm id={pesanan.id} status={pesanan.status} tracking={pesanan.tracking_number} />
          <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            Pembayaran online belum aktif, jadi status <b>Sudah dibayar</b> ditandai manual setelah
            transfer masuk. Nanti Midtrans yang menandainya lewat webhook.
          </p>
        </section>
      </div>

      <p className="mt-6 text-xs text-muted">
        Tautan status pembeli: {SITE.url}/pesanan/{pesanan.order_number}
      </p>
    </>
  );
}
