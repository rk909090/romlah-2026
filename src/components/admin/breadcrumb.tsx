import Link from "next/link";

/** Remah roti sederhana untuk halaman anak di panel admin. */
export function Breadcrumb({ induk, hrefInduk, kini }: { induk: string; hrefInduk: string; kini: string }) {
  return (
    <nav className="mb-4 text-sm text-muted">
      <Link href={hrefInduk} className="hover:text-jingga">
        {induk}
      </Link>
      <span className="px-1.5">/</span>
      <span className="text-ink-2">{kini}</span>
    </nav>
  );
}
