import { AdminHeading } from "@/components/admin/admin-shell";
import { query } from "@/lib/db";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Pesanan" };

type BarisPesanan = {
  id: number;
  order_number: string;
  channel: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  created_at: string;
};

const WARNA: Record<string, string> = {
  menunggu_konfirmasi: "bg-warn-soft text-warn",
  menunggu_bayar: "bg-jingga-soft text-jingga",
  dibayar: "bg-pandan-soft text-pandan",
  diproses: "bg-pandan-soft text-pandan",
  dikirim: "bg-pandan-soft text-pandan",
  selesai: "bg-pandan-soft text-pandan",
};

export default async function Pesanan() {
  const pesanan = await query<BarisPesanan>(
    `SELECT id, order_number, channel, status, customer_name, customer_phone, total, created_at
       FROM orders ORDER BY created_at DESC LIMIT 100`,
  );

  return (
    <>
      <AdminHeading title="Pesanan" description="Pesanan dari website dan dari WhatsApp, dalam satu daftar." />

      {pesanan.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">Belum ada pesanan tersimpan</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
            Tabelnya sudah siap, tapi belum ada yang menulis ke sini. Saat ini tombol{" "}
            <b>Pesan lewat WhatsApp</b> di keranjang hanya menyusun pesan dan membuat nomor pesanan di
            browser — nomor itu belum tersimpan ke basis data.
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
            Menyambungkannya adalah langkah berikutnya: setiap pesanan WhatsApp akan tercatat di sini
            lengkap dengan rincian barang, ongkir, dan alamat, sehingga tidak perlu diketik ulang.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Nomor</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Pelanggan</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Kanal</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pesanan.map((p) => (
                  <tr key={p.id}>
                    <td className="tabular px-4 py-3 font-semibold">{p.order_number}</td>
                    <td className="px-4 py-3">
                      <span className="block font-medium">{p.customer_name}</span>
                      <span className="block text-xs text-muted">{p.customer_phone}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-2 capitalize">{p.channel}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          WARNA[p.status] ?? "bg-sunken text-muted"
                        }`}
                      >
                        {p.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-right font-bold">{rupiah(Number(p.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
