"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "./cart-provider";

const TABS = [
  { href: "/", label: "Beranda", d: "M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" },
  { href: "/katalog", label: "Katalog", d: "M4 5h16M4 12h16M4 19h16" },
  { href: "/katalog?kategori=paket", label: "Paket", d: "M4 8h16v11H4V8Zm0 0 2-3h12l2 3M12 8v11" },
  { href: "/keranjang", label: "Keranjang", d: "M6 7h12l-1 12H7L6 7Zm3.5 0a2.5 2.5 0 0 1 5 0" },
];

export function BottomNav({ paketAktif }: { paketAktif: boolean }) {
  const pathname = usePathname();
  const { jumlahItem, ready } = useCart();

  // Tab Paket hilang selama kategorinya dimatikan; tanpa ini tab-nya tetap
  // ada tapi membuka katalog kosong.
  const tabs = paketAktif ? TABS : TABS.filter((t) => t.label !== "Paket");

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-lg">
        {tabs.map((t) => {
          const base = t.href.split("?")[0];
          const aktif = base === "/" ? pathname === "/" : pathname.startsWith(base);
          return (
            <li key={t.label} className="flex-1">
              <Link
                href={t.href}
                aria-current={aktif ? "page" : undefined}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  aktif ? "text-jingga" : "text-muted"
                }`}
              >
                <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.d} />
                </svg>
                {t.label}
                {t.label === "Keranjang" && ready && jumlahItem > 0 && (
                  <span className="tabular absolute top-1 right-[22%] grid h-4 min-w-4 place-items-center rounded-full bg-jingga px-1 text-[9px] font-bold text-jingga-ink">
                    {jumlahItem}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
