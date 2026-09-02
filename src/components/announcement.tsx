import Link from "next/link";
import type { Banner } from "@/lib/promo";

/**
 * Banner pengumuman di paling atas toko.
 *
 * Diisi dari panel admin. Tautannya sudah disaring di server action —
 * hanya "/" di awal atau http(s) — supaya `javascript:` tidak bisa masuk
 * lewat panel dan dijalankan di peramban pengunjung.
 */
export function Announcement({ banner }: { banner: Banner }) {
  if (!banner.aktif || !banner.teks) return null;

  const isi = <span className="text-xs leading-snug font-medium">{banner.teks}</span>;

  return (
    <div className="bg-ink px-4 py-2.5 text-center text-bg">
      {banner.tautan ? (
        banner.tautan.startsWith("/") ? (
          <Link href={banner.tautan} className="underline-offset-4 hover:underline">
            {isi}
          </Link>
        ) : (
          <a
            href={banner.tautan}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {isi}
          </a>
        )
      ) : (
        isi
      )}
    </div>
  );
}
