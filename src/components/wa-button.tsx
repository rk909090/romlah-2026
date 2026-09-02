import { SITE } from "@/data/site";

/**
 * Tombol WhatsApp — satu bentuk untuk seluruh situs.
 *
 * Sebelumnya tiap halaman menulis kelasnya sendiri dan hasilnya tidak seragam:
 * kebanyakan bergaya garis tepi dengan latar bening, hanya halaman keranjang
 * yang sudah solid. Semuanya kini lewat komponen ini.
 *
 * Bukan komponen klien: isinya hanya <a>, jadi tetap dirender di server.
 */

type Props = {
  /** Teks yang sudah terisi di kolom pesan WhatsApp. Kosongkan untuk chat polos. */
  pesan?: string;
  /** Nomor tujuan, format internasional tanpa plus. Bawaannya nomor toko. */
  nomor?: string;
  children: React.ReactNode;
  /** "penuh" melebar mengikuti induknya; "inline" selebar isinya. */
  lebar?: "penuh" | "inline";
  /** "besar" untuk aksi utama, "kecil" untuk tombol di dalam kartu. */
  ukuran?: "besar" | "kecil";
  className?: string;
};

export function IkonWa({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.9-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.7-.1 1.3Z" />
    </svg>
  );
}

export function WaButton({
  pesan,
  nomor = SITE.whatsapp.number,
  children,
  lebar = "penuh",
  ukuran = "besar",
  className = "",
}: Props) {
  const href = `https://wa.me/${nomor}${pesan ? `?text=${encodeURIComponent(pesan)}` : ""}`;

  return (
    <a
      href={href}
      // WhatsApp adalah tujuan di luar situs: dibuka di tab baru supaya
      // keranjang dan halaman yang sedang dibaca tidak ikut hilang.
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl bg-wa font-semibold text-wa-ink shadow-float transition hover:bg-wa-2",
        lebar === "penuh" ? "flex w-full" : "",
        ukuran === "besar" ? "px-6 py-3.5 text-sm" : "px-4 py-2 text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <IkonWa className={ukuran === "besar" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {children}
    </a>
  );
}
