import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { listCustomers, tampilkanTelepon } from "@/lib/admin/customers";
import { rupiah } from "@/lib/format";

export const metadata = { title: "Pelanggan" };
export const dynamic = "force-dynamic";

export default async function Pelanggan({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const pelanggan = await listCustomers(q);

  return (
    <>
      <AdminHeading
        title="Pelanggan"
        description="Satu baris per nomor WhatsApp — pesanan dari web dan dari WhatsApp menyatu di sini."
      />

      <form method="get" className="mb-4">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cari nama, nomor, atau email…"
          className="w-full max-w-sm rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-jingga"
        />
      </form>

      {pelanggan.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">
            {q ? "Tidak ada yang cocok" : "Belum ada pelanggan tersimpan"}
          </p>
          {q ? (
            <Link href="/admin/pelanggan" className="mt-3 inline-block text-sm font-medium text-jingga hover:underline">
              Tampilkan semua
            </Link>
          ) : (
            <>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
                Tabelnya sudah ada, tapi belum ada yang menulis ke sini. Pelanggan tercatat otomatis saat
                pesanan pertama masuk — dan itu baru terjadi setelah tombol{" "}
                <b>Pesan lewat WhatsApp</b> di keranjang menyimpan pesanannya ke basis data.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-2">
                Nomor telepon yang jadi kuncinya, bukan email: pembeli lewat WhatsApp datang membawa
                nomor. Nomor dinormalkan lebih dulu, sehingga <code className="rounded bg-sunken px-1">0812…</code>,{" "}
                <code className="rounded bg-sunken px-1">+62812…</code>, dan{" "}
                <code className="rounded bg-sunken px-1">62812…</code> tidak tercatat sebagai tiga orang berbeda.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken text-left">
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Nama</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">WhatsApp</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Pesanan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Total belanja</th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Terakhir pesan</th>
                  <th className="px-4 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pelanggan.map((c) => (
                  <tr key={c.id} className="transition hover:bg-sunken">
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/admin/pelanggan/${c.id}`} className="hover:text-jingga">
                        {c.name}
                      </Link>
                    </td>
                    <td className="tabular px-4 py-3 text-ink-2">{tampilkanTelepon(c.phone)}</td>
                    <td className="tabular px-4 py-3 text-right">{c.orderCount}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{rupiah(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-ink-2">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pelanggan/${c.id}`}
                        className="text-xs font-medium text-jingga hover:underline"
                      >
                        Detail →
                      </Link>
                    </td>
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
