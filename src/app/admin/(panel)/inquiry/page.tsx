import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { DateFilter } from "@/components/admin/date-filter";
import { bacaHalaman, Pagination } from "@/components/admin/pagination";
import { LeadForm } from "@/components/admin/lead-form";
import { IkonWa } from "@/components/wa-button";
import { tampilkanTelepon } from "@/lib/admin/customers";
import {
  LABEL_STATUS_LEAD,
  LABEL_SUMBER,
  STATUS_LEAD,
  WARNA_STATUS_LEAD,
} from "@/lib/lead-status";
import { bacaRentang } from "@/lib/admin/rentang";
import { hitungLeadRentang, listLeads } from "@/lib/leads";

export const metadata = { title: "Inquiry WA" };
export const dynamic = "force-dynamic";

function Chip({ aktif, href, children }: { aktif: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        aktif ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-2"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function Inquiry({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string; status?: string; rentang?: string;
    dari?: string; sampai?: string; hal?: string; per?: string;
  }>;
}) {
  const sp = await searchParams;
  const r = bacaRentang(sp);

  // Saringan yang sama persis dipakai daftar dan ringkasan angkanya.
  const saring = { q: sp.q, status: sp.status, mulaiUtc: r.mulaiUtc, sebelumUtc: r.sebelumUtc };
  const hitung = await hitungLeadRentang(saring);
  const h = bacaHalaman(sp, hitung.total);
  const leads = await listLeads(saring, { per: h.per, lewati: h.lewati });

  const adaSaringan = r.aktif || Boolean(sp.q) || Boolean(sp.status);

  const qs = (patch: Record<string, string | undefined>) => {
    // `hal` sengaja tidak dibawa: mengganti status harus memulai dari
    // halaman 1, kalau tidak hasilnya bisa mendarat di halaman kosong.
    const next = {
      q: sp.q, status: sp.status, per: sp.per,
      rentang: sp.rentang, dari: sp.dari, sampai: sp.sampai,
      ...patch,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/inquiry?${s}` : "/admin/inquiry";
  };

  return (
    <>
      <AdminHeading
        title="Inquiry WA"
        description="Pertanyaan yang masuk lewat tombol WhatsApp di toko. Pesanan sungguhan ada di menu Pesanan."
      />

      <DateFilter basePath="/admin/inquiry" r={r} lain={{ q: sp.q, status: sp.status }} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: "Prospek", nilai: hitung.total, catatan: r.label },
          { label: "Belum ditindaklanjuti", nilai: hitung.baru, catatan: "Berstatus baru" },
          { label: "Jadi pesanan", nilai: hitung.jadiPesanan, catatan: "Ditandai manual" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase">{k.label}</p>
            <p className="tabular mt-1 text-2xl font-extrabold">{k.nilai}</p>
            <p className="mt-0.5 text-xs text-muted">{k.catatan}</p>
          </div>
        ))}
      </div>

      <form method="get" className="mb-3">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        {sp.rentang && <input type="hidden" name="rentang" value={sp.rentang} />}
        {sp.dari && <input type="hidden" name="dari" value={sp.dari} />}
        {sp.sampai && <input type="hidden" name="sampai" value={sp.sampai} />}
        {sp.per && <input type="hidden" name="per" value={sp.per} />}
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Cari nama, nomor, email, atau isi pertanyaan…"
          className="w-full max-w-sm rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-jingga"
        />
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        <Chip aktif={!sp.status} href={qs({ status: undefined })}>
          Semua
        </Chip>
        {STATUS_LEAD.map((s) => (
          <Chip key={s} aktif={sp.status === s} href={qs({ status: sp.status === s ? undefined : s })}>
            {LABEL_STATUS_LEAD[s]}
          </Chip>
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">
            {adaSaringan ? "Tidak ada yang cocok" : "Belum ada prospek masuk"}
          </p>
          {adaSaringan ? (
            <Link href="/admin/inquiry" className="mt-3 inline-block text-sm font-medium text-jingga hover:underline">
              Tampilkan semua
            </Link>
          ) : (
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
              Setiap tombol WhatsApp di toko — beranda, halaman produk, halaman toko, footer, dan
              halaman status pesanan — kini meminta nama dan nomor lebih dulu. Yang terisi masuk ke
              sini. Tombol <b>Pesan lewat WhatsApp</b> di keranjang tidak lewat sini karena yang itu
              sudah membuat pesanan sungguhan.
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display font-bold">
                      {l.customerId ? (
                        <Link href={`/admin/pelanggan/${l.customerId}`} className="hover:text-jingga">
                          {l.name}
                        </Link>
                      ) : (
                        l.name
                      )}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${WARNA_STATUS_LEAD[l.status]}`}
                    >
                      {LABEL_STATUS_LEAD[l.status]}
                    </span>
                  </div>
                  <p className="tabular mt-1 text-sm text-ink-2">{tampilkanTelepon(l.phone)}</p>
                  {l.email && <p className="text-sm text-ink-2">{l.email}</p>}
                </div>

                <div className="text-right text-xs text-muted">
                  {/* Ditampilkan dalam WIB; kolomnya tersimpan dalam UTC. */}
                  <p>
                    {new Date(l.createdAt).toLocaleString("id-ID", {
                      timeZone: "Asia/Jakarta",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-0.5">{LABEL_SUMBER[l.source] ?? l.source}</p>
                  {l.productSlug && (
                    <Link
                      href={`/produk/${l.productSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-block underline underline-offset-2 hover:text-ink-2"
                    >
                      {l.productSlug} ↗
                    </Link>
                  )}
                </div>
              </div>

              {l.message && (
                <p className="mt-3 rounded-xl bg-sunken px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-2">
                  {l.message}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <a
                  href={`https://wa.me/${l.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-wa px-3.5 py-2 text-xs font-semibold text-wa-ink transition hover:bg-wa-2"
                >
                  <IkonWa className="h-3.5 w-3.5" />
                  Balas
                </a>
                <LeadForm lead={l} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {hitung.total > 0 && (
        <Pagination
          basePath="/admin/inquiry"
          h={h}
          lain={{
            q: sp.q, status: sp.status, per: sp.per,
            rentang: sp.rentang, dari: sp.dari, sampai: sp.sampai,
          }}
          satuan="prospek"
        />
      )}
    </>
  );
}
