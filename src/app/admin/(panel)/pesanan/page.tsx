import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { DateFilter } from "@/components/admin/date-filter";
import { bacaRentang, syaratRentang } from "@/lib/admin/rentang";
import { query, type SqlParam } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { labelStatus, SEMUA_STATUS, STATUS_BATAL } from "@/lib/order-status";

export const metadata = { title: "Pesanan" };
export const dynamic = "force-dynamic";

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

const kelasChip = (aktif: boolean) =>
  `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
    aktif ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-2 hover:border-line-2"
  }`;

export default async function Pesanan({
  searchParams,
}: {
  searchParams: Promise<{ rentang?: string; dari?: string; sampai?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const r = bacaRentang(sp);
  const status = SEMUA_STATUS.includes(sp.status as never) ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;

  const syarat: string[] = [];
  const nilai: SqlParam[] = [];

  const waktu = syaratRentang(r, "created_at");
  if (waktu.sql) {
    syarat.push(waktu.sql);
    nilai.push(...waktu.nilai);
  }
  if (status) {
    syarat.push("status = ?");
    nilai.push(status);
  }
  if (q) {
    syarat.push("(order_number LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ?)");
    nilai.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = syarat.length ? ` WHERE ${syarat.join(" AND ")}` : "";

  const [pesanan, ringkas] = await Promise.all([
    query<BarisPesanan>(
      `SELECT id, order_number, channel, status, customer_name, customer_phone, total, created_at
         FROM orders${where} ORDER BY created_at DESC LIMIT 300`,
      nilai,
    ),
    // Ringkasan dihitung di basis data atas SELURUH hasil saringan, bukan
    // dari 300 baris yang kebetulan terambil — kalau tidak, angkanya bohong
    // begitu hasilnya lebih dari batas itu.
    query<{ jumlah: number; nilai: number; jadi: number; nilaiJadi: number }>(
      `SELECT COUNT(*) AS jumlah,
              COALESCE(SUM(total), 0) AS nilai,
              SUM(status NOT IN (${STATUS_BATAL.map(() => "?").join(",")})) AS jadi,
              COALESCE(SUM(CASE WHEN status NOT IN (${STATUS_BATAL.map(() => "?").join(",")})
                                THEN total ELSE 0 END), 0) AS nilaiJadi
         FROM orders${where}`,
      [...STATUS_BATAL, ...STATUS_BATAL, ...nilai],
    ),
  ]);

  const s = ringkas[0];
  const jumlah = Number(s?.jumlah ?? 0);
  const jadi = Number(s?.jadi ?? 0);
  const nilaiJadi = Number(s?.nilaiJadi ?? 0);
  const adaSaringan = r.aktif || Boolean(status) || Boolean(q);

  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { rentang: sp.rentang, dari: sp.dari, sampai: sp.sampai, status: sp.status, q: sp.q, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const t = p.toString();
    return t ? `/admin/pesanan?${t}` : "/admin/pesanan";
  };

  return (
    <>
      <AdminHeading title="Pesanan" description="Pesanan dari website dan dari WhatsApp, dalam satu daftar." />

      <DateFilter basePath="/admin/pesanan" r={r} lain={{ status: sp.status, q: sp.q }} />

      <form method="get" className="mb-3">
        {sp.rentang && <input type="hidden" name="rentang" value={sp.rentang} />}
        {sp.dari && <input type="hidden" name="dari" value={sp.dari} />}
        {sp.sampai && <input type="hidden" name="sampai" value={sp.sampai} />}
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Cari nomor pesanan, nama, atau telepon…"
          className="w-full max-w-sm rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none focus:border-jingga"
        />
      </form>

      <div className="rail mb-5 flex gap-2">
        <Link href={href({ status: undefined })} className={kelasChip(!status)}>
          Semua status
        </Link>
        {SEMUA_STATUS.map((st) => (
          <Link
            key={st}
            href={href({ status: status === st ? undefined : st })}
            className={kelasChip(status === st)}
          >
            {labelStatus(st)}
          </Link>
        ))}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Pesanan</p>
          <p className="tabular mt-1 text-2xl font-extrabold">{jumlah}</p>
          <p className="mt-0.5 text-xs text-muted">{r.label}</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Pesanan jadi</p>
          <p className="tabular mt-1 text-2xl font-extrabold">{jadi}</p>
          <p className="mt-0.5 text-xs text-muted">Di luar batal, kedaluwarsa, dikembalikan</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">Nilai pesanan jadi</p>
          <p className="tabular mt-1 text-2xl font-extrabold">{rupiah(nilaiJadi)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {jadi > 0 ? `Rata-rata ${rupiah(Math.round(nilaiJadi / jadi))}` : "Belum ada"}
          </p>
        </div>
      </div>

      {pesanan.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-card">
          <p className="font-display text-lg font-bold">
            {adaSaringan ? "Tidak ada pesanan pada saringan ini" : "Belum ada pesanan tersimpan"}
          </p>
          {adaSaringan ? (
            <Link href="/admin/pesanan" className="mt-3 inline-block text-sm font-medium text-jingga hover:underline">
              Tampilkan semua
            </Link>
          ) : (
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-2">
              Pesanan dari halaman keranjang — baik lewat pembayaran online maupun lewat WhatsApp —
              tercatat di sini lengkap dengan rincian barang, ongkir, dan alamatnya.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-line bg-sunken text-left">
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Nomor</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Tanggal</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Pelanggan</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Kanal</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wider text-muted uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold tracking-wider text-muted uppercase">Total</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pesanan.map((p) => (
                    <tr key={p.id} className="transition hover:bg-sunken">
                      <td className="tabular px-4 py-3 font-semibold">
                        <Link href={`/admin/pesanan/${p.id}`} className="hover:text-jingga">
                          {p.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-2">
                        {/* Ditampilkan dalam WIB, sesuai jam toko — kolomnya
                            sendiri tersimpan dalam UTC. */}
                        {new Date(p.created_at).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium">{p.customer_name}</span>
                        <span className="tabular block text-xs text-muted">{p.customer_phone}</span>
                      </td>
                      <td className="px-4 py-3 text-ink-2 capitalize">{p.channel}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
                            WARNA[p.status] ?? "bg-sunken text-muted"
                          }`}
                        >
                          {labelStatus(p.status)}
                        </span>
                      </td>
                      <td className="tabular px-4 py-3 text-right font-bold">{rupiah(Number(p.total))}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/pesanan/${p.id}`}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition hover:bg-sunken"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {jumlah > pesanan.length && (
            <p className="mt-3 text-center text-xs text-muted">
              Menampilkan {pesanan.length} terbaru dari {jumlah} pesanan. Persempit periodenya untuk
              melihat sisanya.
            </p>
          )}
        </>
      )}
    </>
  );
}
