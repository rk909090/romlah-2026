import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/admin-shell";
import { IkonWa } from "@/components/wa-button";
import {
  getCustomer,
  getCustomerAddresses,
  getCustomerOrders,
  tampilkanTelepon,
} from "@/lib/admin/customers";
import { rupiah } from "@/lib/format";
import { LABEL_STATUS_LEAD, LABEL_SUMBER, WARNA_STATUS_LEAD } from "@/lib/lead-status";
import { getLeadsPelanggan } from "@/lib/leads";
import { labelStatus } from "@/lib/order-status";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = await getCustomer(Number(id));
  return { title: c ? c.name : "Pelanggan tidak ditemukan" };
}

function Kartu({ label, nilai, catatan }: { label: string; nilai: string; catatan?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">{label}</p>
      <p className="tabular mt-1 text-xl font-extrabold">{nilai}</p>
      {catatan && <p className="mt-0.5 text-xs text-muted">{catatan}</p>}
    </div>
  );
}

export default async function DetailPelanggan({ params }: Props) {
  const { id } = await params;
  const idAngka = Number(id);
  if (!Number.isInteger(idAngka)) notFound();

  const pelanggan = await getCustomer(idAngka);
  if (!pelanggan) notFound();

  const [alamat, pesanan, prospek] = await Promise.all([
    getCustomerAddresses(pelanggan.id),
    getCustomerOrders(pelanggan.id),
    getLeadsPelanggan(pelanggan.id),
  ]);

  // Rata-rata hanya dihitung dari pesanan yang benar-benar jadi. totalSpent
  // sudah mengecualikan pesanan batal, kedaluwarsa, dan dikembalikan, jadi
  // pembaginya harus memakai ukuran yang sama supaya angkanya tidak bohong.
  const pesananJadi = pesanan.filter(
    (p) => !["dibatalkan", "kedaluwarsa", "dikembalikan"].includes(p.status),
  );
  const rata = pesananJadi.length > 0 ? Math.round(pelanggan.totalSpent / pesananJadi.length) : 0;

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/pelanggan" className="hover:text-jingga">
          Pelanggan
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-ink-2">{pelanggan.name}</span>
      </nav>

      <AdminHeading
        title={pelanggan.name}
        description={`Bergabung ${new Date(pelanggan.createdAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}`}
        action={
          <a
            href={`https://wa.me/${pelanggan.phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-wa px-5 py-3 text-sm font-semibold text-wa-ink transition hover:bg-wa-2"
          >
            <IkonWa />
            Chat pelanggan
          </a>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kartu label="Pesanan" nilai={String(pelanggan.orderCount)} />
        <Kartu
          label="Total belanja"
          nilai={rupiah(pelanggan.totalSpent)}
          catatan="Di luar pesanan batal"
        />
        <Kartu
          label="Rata-rata"
          nilai={rata > 0 ? rupiah(rata) : "—"}
          catatan={pesananJadi.length > 0 ? `dari ${pesananJadi.length} pesanan jadi` : undefined}
        />
        <Kartu label="Inquiry WA" nilai={String(prospek.length)} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        {/* ── Profil ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h2 className="font-display mb-3 font-bold">Profil</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
              <dt className="text-muted">Nama</dt>
              <dd className="font-medium">{pelanggan.name}</dd>
              <dt className="text-muted">WhatsApp</dt>
              <dd className="tabular font-medium">{tampilkanTelepon(pelanggan.phone)}</dd>
              <dt className="text-muted">Email</dt>
              <dd className="font-medium break-all">{pelanggan.email ?? "—"}</dd>
              <dt className="text-muted">Terakhir pesan</dt>
              <dd className="font-medium">
                {pelanggan.lastOrderAt
                  ? new Date(pelanggan.lastOrderAt).toLocaleString("id-ID")
                  : "Belum pernah"}
              </dd>
              {pelanggan.note && (
                <>
                  <dt className="text-muted">Catatan</dt>
                  <dd>{pelanggan.note}</dd>
                </>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h2 className="font-display mb-3 font-bold">
              Alamat tersimpan {alamat.length > 0 && <span className="text-muted">({alamat.length})</span>}
            </h2>
            {alamat.length === 0 ? (
              <p className="text-sm text-ink-2">
                Belum ada. Alamat tersimpan sendiri saat pelanggan menyelesaikan pesanan.
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {alamat.map((a) => (
                  <li key={a.id} className="rounded-xl border border-line p-3.5">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{a.recipient_name}</p>
                      {a.is_default === 1 && (
                        <span className="rounded-full bg-pandan-soft px-2 py-0.5 text-[10px] font-semibold text-pandan">
                          Utama
                        </span>
                      )}
                    </div>
                    <p className="tabular text-xs text-muted">{tampilkanTelepon(a.phone)}</p>
                    <p className="mt-1.5 leading-relaxed text-ink-2">{a.address}</p>
                    {a.destination_label && (
                      <p className="mt-0.5 text-xs text-muted">{a.destination_label}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Riwayat ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          <section className="rounded-2xl border border-line bg-surface shadow-card">
            <h2 className="font-display border-b border-line px-5 py-4 font-bold">
              Riwayat pesanan {pesanan.length > 0 && <span className="text-muted">({pesanan.length})</span>}
            </h2>
            {pesanan.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-2">
                Belum ada pesanan atas nama pelanggan ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-sunken text-left">
                      <th className="px-5 py-2.5 text-xs font-semibold tracking-wider text-muted uppercase">Nomor</th>
                      <th className="px-4 py-2.5 text-xs font-semibold tracking-wider text-muted uppercase">Tanggal</th>
                      <th className="px-4 py-2.5 text-xs font-semibold tracking-wider text-muted uppercase">Status</th>
                      <th className="px-5 py-2.5 text-right text-xs font-semibold tracking-wider text-muted uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {pesanan.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3">
                          <Link href={`/admin/pesanan/${p.id}`} className="tabular font-semibold hover:text-jingga">
                            {p.order_number}
                          </Link>
                          <span className="ml-2 text-xs text-muted capitalize">{p.channel}</span>
                        </td>
                        <td className="px-4 py-3 text-ink-2">
                          {new Date(p.created_at).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-4 py-3 text-ink-2">{labelStatus(p.status)}</td>
                        <td className="tabular px-5 py-3 text-right font-semibold">
                          {rupiah(Number(p.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
            <h2 className="font-display mb-3 font-bold">
              Inquiry WhatsApp {prospek.length > 0 && <span className="text-muted">({prospek.length})</span>}
            </h2>
            {prospek.length === 0 ? (
              <p className="text-sm text-ink-2">
                Pelanggan ini belum pernah bertanya lewat tombol WhatsApp di toko.
              </p>
            ) : (
              <ul className="space-y-3">
                {prospek.map((l) => (
                  <li key={l.id} className="rounded-xl border border-line p-3.5 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${WARNA_STATUS_LEAD[l.status]}`}
                      >
                        {LABEL_STATUS_LEAD[l.status]}
                      </span>
                      <span className="text-xs text-muted">
                        {LABEL_SUMBER[l.source] ?? l.source} ·{" "}
                        {new Date(l.createdAt).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {l.message && (
                      <p className="mt-2 leading-relaxed whitespace-pre-wrap text-ink-2">{l.message}</p>
                    )}
                    {l.adminNote && (
                      <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
                        Catatan admin: {l.adminNote}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/admin/inquiry"
              className="mt-4 inline-block text-xs font-medium text-jingga hover:underline"
            >
              Buka semua inquiry →
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
