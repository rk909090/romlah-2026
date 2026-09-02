import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { DateFilter } from "@/components/admin/date-filter";
import { bacaRentang } from "@/lib/admin/rentang";
import { queryOne } from "@/lib/db";

export const metadata = { title: "Ekspor data" };
export const dynamic = "force-dynamic";

type Jenis = {
  jenis: string;
  judul: string;
  ringkas: string;
  kolom: string;
};

const JENIS: Jenis[] = [
  {
    jenis: "prospek",
    judul: "Prospek WhatsApp",
    ringkas: "Semua yang mengisi formulir sebelum chat. Disaring pada tanggal masuknya.",
    kolom: "Waktu, nama, WhatsApp, email, sumber, produk, status, pertanyaan, catatan admin",
  },
  {
    jenis: "pelanggan",
    judul: "Pelanggan",
    ringkas: "Satu baris per nomor. Disaring pada tanggal pesanan terakhir.",
    kolom: "Nama, WhatsApp, email, tanggal daftar, pesanan terakhir, jumlah pesanan, total belanja",
  },
  {
    jenis: "pesanan",
    judul: "Pesanan",
    ringkas: "Seluruh pesanan beserta ongkir dan tujuannya. Disaring pada tanggal pesanan.",
    kolom: "Waktu, nomor, kanal, status, pembeli, kurir, subtotal, ongkir, total, berat, alamat",
  },
];

export default async function Ekspor({
  searchParams,
}: {
  searchParams: Promise<{ rentang?: string; dari?: string; sampai?: string }>;
}) {
  const sp = await searchParams;
  const r = bacaRentang(sp);

  const hitung = await queryOne<{ prospek: number; pelanggan: number; pesanan: number }>(
    `SELECT (SELECT COUNT(*) FROM wa_leads)  AS prospek,
            (SELECT COUNT(*) FROM customers) AS pelanggan,
            (SELECT COUNT(*) FROM orders)    AS pesanan`,
  );
  const total: Record<string, number> = {
    prospek: Number(hitung?.prospek ?? 0),
    pelanggan: Number(hitung?.pelanggan ?? 0),
    pesanan: Number(hitung?.pesanan ?? 0),
  };

  const qs = (jenis: string) => {
    const p = new URLSearchParams({ jenis });
    if (sp.rentang) p.set("rentang", sp.rentang);
    if (sp.dari) p.set("dari", sp.dari);
    if (sp.sampai) p.set("sampai", sp.sampai);
    return `/api/admin/ekspor?${p.toString()}`;
  };

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Ekspor data" />
      <AdminHeading
        title="Ekspor data"
        description="Unduh sebagai CSV untuk blast WhatsApp, kirim penawaran, atau diolah di spreadsheet."
      />

      <DateFilter basePath="/admin/marketing/ekspor" r={r} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {JENIS.map((j) => (
          <li
            key={j.jenis}
            className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display font-bold">{j.judul}</h2>
              <span className="tabular shrink-0 text-xs text-muted">{total[j.jenis]} baris total</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{j.ringkas}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted">Kolom: {j.kolom}</p>
            <a
              href={qs(j.jenis)}
              // download tidak dipakai: berkasnya sudah dikirim dengan
              // Content-Disposition attachment dari server.
              className="mt-auto pt-4 text-sm font-semibold text-jingga hover:underline"
            >
              Unduh CSV ({r.label.toLowerCase()}) ↓
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-2xl border border-warn/40 bg-warn-soft p-5 text-sm leading-relaxed text-ink-2">
        <p className="font-semibold">Berkasnya berisi data pribadi.</p>
        <p className="mt-1.5">
          Nama, nomor WhatsApp, email, dan alamat pelanggan ikut terunduh. Simpan di tempat yang
          aman, jangan diunggah ke layanan pihak ketiga, dan hapus salinannya kalau sudah tidak
          dipakai. Pengunduhannya sendiri dijaga sesi admin.
        </p>
      </div>
    </>
  );
}
