"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { keluar } from "@/app/admin/actions";
import type { AdminUser } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dasbor", exact: true, d: "M4 12 12 5l8 7v7a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1v-7Z" },
  { href: "/admin/produk", label: "Produk", d: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Zm0 0 8 4.5m0 0 8-4.5m-8 4.5V20" },
  { href: "/admin/pesanan", label: "Pesanan", d: "M6 4h9l4 4v12H6V4Zm9 0v4h4M9 12h7M9 16h5" },
  { href: "/admin/pengaturan", label: "Pengaturan", d: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm8 3a8 8 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a8 8 0 0 0-2.9-1.7L14.2 2H9.8l-.4 2.7a8 8 0 0 0-2.9 1.7l-2.3-1-2 3.4 2 1.5a8 8 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a8 8 0 0 0 2.9 1.7l.4 2.7h4.4l.4-2.7a8 8 0 0 0 2.9-1.7l2.3 1 2-3.4-2-1.5c.13-.55.2-1.12.2-1.7Z" },
];

function Ikon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-[18px] w-[18px] shrink-0" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 p-3">
      {NAV.map((n) => {
        const aktif = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setBuka(false)}
            aria-current={aktif ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              aktif ? "bg-jingga text-jingga-ink shadow-card" : "text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            <Ikon d={n.d} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const isiSidebar = (
    <>
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-4">
        <Image src="/merek/romlah-logo.png" alt="" width={116} height={110} className="h-8 w-auto" />
        <div className="min-w-0">
          <p className="font-display text-sm leading-tight font-extrabold">Romlah</p>
          <p className="text-[11px] leading-tight text-muted">Panel admin</p>
        </div>
      </div>

      {nav}

      <div className="border-t border-line p-3">
        <Link
          href="/"
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-2 transition hover:bg-sunken hover:text-ink"
        >
          <Ikon d="M10 6 4 12l6 6M4 12h16" />
          Lihat toko
        </Link>
        <div className="rounded-lg bg-sunken p-3">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <form action={keluar}>
            <button
              type="submit"
              className="mt-2.5 w-full rounded-md border border-line-2 bg-surface px-3 py-1.5 text-xs font-semibold transition hover:bg-bg"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-sunken">
      {/* Sidebar tetap di layar lebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        {isiSidebar}
      </aside>

      {/* Bilah atas di layar sempit */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setBuka(true)}
          aria-label="Buka menu"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line"
        >
          <Ikon d="M4 7h16M4 12h16M4 17h16" />
        </button>
        <Image src="/merek/romlah-logo.png" alt="" width={116} height={110} className="h-7 w-auto" />
        <span className="font-display text-sm font-extrabold">Panel admin</span>
      </header>

      {/* Panel geser di layar sempit */}
      {buka && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setBuka(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface">
            {isiSidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

/** Judul halaman admin dengan aksi opsional di kanan. */
export function AdminHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
