import Link from "next/link";
import { AdminHeading } from "@/components/admin/admin-shell";
import { listPaket, listStatusKategori } from "@/lib/admin/packages";
import { rupiah } from "@/lib/format";
import { getPengaturan } from "@/lib/settings";
import { midtransAktif } from "@/lib/midtrans";

export const metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

/**
 * Halaman muka Marketing.
 *
 * Sengaja hanya daftar fitur, bukan tumpukan formulir. Program pemasaran akan
 * terus bertambah, dan satu halaman berisi semuanya cepat jadi tidak terbaca —
 * lagi pula tiap program punya risiko sendiri, sehingga lebih aman diubah satu
 * per satu dengan penjelasannya di layar yang sama.
 */

type Kartu = {
  href: string;
  judul: string;
  ringkas: string;
  status: { teks: string; nyala: boolean } | null;
  d: string;
};

function Ikon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export default async function Marketing() {
  const [kategori, paket, set] = await Promise.all([
    listStatusKategori(),
    listPaket(),
    getPengaturan(),
  ]);

  const paketNyala = kategori.find((k) => k.slug === "paket")?.isActive ?? false;
  const paketTayang = paket.filter((p) => p.isActive).length;
  const g = set.gratisOngkir;
  const bayar = midtransAktif();

  const kartu: Kartu[] = [
    {
      href: "/admin/marketing/paket",
      judul: "Paket",
      ringkas:
        paket.length === 0
          ? "Belum ada paket dibuat"
          : `${paketTayang} dari ${paket.length} paket tayang`,
      status: { teks: paketNyala ? "Tayang" : "Tidak tayang", nyala: paketNyala },
      d: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Zm0 0 8 4.5m0 0 8-4.5m-8 4.5V20",
    },
    {
      href: "/admin/marketing/ongkir",
      judul: "Kirim gratis",
      ringkas: g.aktif
        ? `Mulai ${rupiah(g.minBelanja)}${g.maksPotongan > 0 ? `, dibatasi ${rupiah(g.maksPotongan)}` : ", tanpa batas potongan"}`
        : "Semua pesanan membayar ongkir penuh",
      status: { teks: g.aktif ? "Nyala" : "Mati", nyala: g.aktif },
      d: "M3 16V8a1 1 0 0 1 1-1h9v9H3Zm10-6h3.5l2.5 3v3h-6v-6ZM7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    },
    {
      href: "/admin/marketing/checkout",
      judul: "Tombol checkout",
      ringkas: set.checkout.tombolWa
        ? "Bayar sekarang dan Pesan lewat WhatsApp"
        : bayar
          ? "Hanya bayar sekarang — tombol WhatsApp disembunyikan"
          : "Disetel hanya bayar, tapi Midtrans belum aktif",
      status: {
        teks: set.checkout.tombolWa ? "Dua jalur" : "Satu jalur",
        nyala: set.checkout.tombolWa,
      },
      d: "M6 7h12l-1 12H7L6 7Zm3.5 0a2.5 2.5 0 0 1 5 0",
    },
    {
      href: "/admin/marketing/banner",
      judul: "Banner pengumuman",
      ringkas: set.banner.aktif && set.banner.teks ? `“${set.banner.teks}”` : "Tidak ada pengumuman tampil",
      status: { teks: set.banner.aktif ? "Tayang" : "Mati", nyala: set.banner.aktif },
      d: "M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Zm13-3a5 5 0 0 1 0 8",
    },
    {
      href: "/admin/marketing/ekspor",
      judul: "Ekspor data",
      ringkas: "Unduh prospek WhatsApp dan pelanggan sebagai CSV",
      status: null,
      d: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2",
    },
  ];

  return (
    <>
      <AdminHeading
        title="Marketing"
        description="Program yang bisa dinyalakan dan dimatikan sewaktu-waktu. Pilih satu untuk mengubah pengaturannya."
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {kartu.map((k) => (
          <li key={k.href}>
            <Link
              href={k.href}
              className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition hover:border-line-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2">
                    <Ikon d={k.d} />
                  </span>
                  <h2 className="font-display font-bold">{k.judul}</h2>
                </div>
                {k.status && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      k.status.nyala ? "bg-pandan-soft text-pandan" : "bg-line text-muted"
                    }`}
                  >
                    {k.status.teks}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-2">{k.ringkas}</p>
              <span className="mt-auto pt-4 text-xs font-medium text-jingga">Atur →</span>
            </Link>
          </li>
        ))}
      </ul>

      {!bayar && (
        <p className="mt-5 rounded-2xl border border-jingga/40 bg-jingga-soft px-5 py-4 text-sm leading-relaxed text-ink-2">
          <b>Midtrans belum aktif di server ini.</b> Selama kunci Midtrans belum terpasang, tombol
          “Pesan lewat WhatsApp” tetap ditampilkan di keranjang apa pun isi pengaturannya — tanpa itu
          tidak ada satu pun cara memesan.
        </p>
      )}
    </>
  );
}
