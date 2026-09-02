"use client";

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore } from "react";
import type { CartLine, Product, ResolvedCartLine } from "@/lib/types";

const STORAGE_KEY = "romlah-keranjang-v1";

type State = {
  lines: CartLine[];
  /** false selama render server — dipakai agar keranjang kosong tidak berkedip. */
  ready: boolean;
};

/* ─────────────────────────────────────────────────────────────
   Keranjang disimpan di localStorage, yang bagi React adalah
   "sumber luar". useSyncExternalStore adalah cara yang benar
   membacanya: tidak ada setState di dalam effect, dan perubahan
   dari tab lain ikut tersinkron.

   Saat database aktif, seluruh blok ini berganti jadi pemanggilan
   server; antarmuka useCart() di bawahnya tidak perlu berubah.
   ───────────────────────────────────────────────────────────── */

function baca(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is CartLine =>
        typeof l === "object" &&
        l !== null &&
        typeof (l as CartLine).slug === "string" &&
        Number.isFinite((l as CartLine).qty) &&
        (l as CartLine).qty > 0,
    );
  } catch {
    // Mode penyamaran atau penyimpanan diblokir — keranjang mulai kosong.
    return [];
  }
}

const STATE_SERVER: State = { lines: [], ready: false };

let state: State = typeof window === "undefined" ? STATE_SERVER : { lines: baca(), ready: true };

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    state = { lines: baca(), ready: true };
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

const getSnapshot = () => state;
const getServerSnapshot = () => STATE_SERVER;

function ubah(fn: (prev: CartLine[]) => CartLine[]) {
  const lines = fn(state.lines);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Penyimpanan penuh atau ditolak — keranjang tetap jalan untuk sesi ini.
  }
  state = { lines, ready: true };
  emit();
}

type CartContextValue = {
  lines: CartLine[];
  ready: boolean;
  tambah: (slug: string, qty?: number, opsi?: { diam?: boolean }) => void;
  ubahQty: (slug: string, qty: number) => void;
  hapus: (slug: string) => void;
  kosongkan: () => void;
  jumlahItem: number;
  qtyDari: (slug: string) => number;
  /* Keranjang mini — panel yang muncul begitu barang ditambahkan. */
  miniBuka: boolean;
  /** Slug yang paling terakhir ditambahkan, untuk disorot di panel. */
  miniTerakhir: string | null;
  tutupMini: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { lines, ready } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Panel keranjang mini. Dibiarkan di React state, bukan di localStorage:
  // ini keadaan tampilan sesaat, tidak perlu bertahan antar-tab atau muat ulang.
  const [miniBuka, setMiniBuka] = useState(false);
  const [miniTerakhir, setMiniTerakhir] = useState<string | null>(null);

  const tambah = useCallback((slug: string, qty = 1, opsi?: { diam?: boolean }) => {
    ubah((prev) => {
      const ada = prev.find((l) => l.slug === slug);
      return ada
        ? prev.map((l) => (l.slug === slug ? { ...l, qty: l.qty + qty } : l))
        : [...prev, { slug, qty }];
    });
    // `diam` dipakai tombol "Beli", yang langsung pindah ke halaman keranjang:
    // panel yang terbuka lalu ikut hilang saat pindah halaman cuma berkedip.
    if (opsi?.diam) return;
    setMiniTerakhir(slug);
    setMiniBuka(true);
  }, []);

  const tutupMini = useCallback(() => setMiniBuka(false), []);

  const ubahQty = useCallback((slug: string, qty: number) => {
    ubah((prev) =>
      qty <= 0 ? prev.filter((l) => l.slug !== slug) : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)),
    );
  }, []);

  const hapus = useCallback((slug: string) => {
    ubah((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const kosongkan = useCallback(() => ubah(() => []), []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      tambah,
      ubahQty,
      hapus,
      kosongkan,
      jumlahItem: lines.reduce((n, l) => n + l.qty, 0),
      qtyDari: (slug: string) => lines.find((l) => l.slug === slug)?.qty ?? 0,
      miniBuka,
      miniTerakhir,
      tutupMini,
    }),
    [lines, ready, tambah, ubahQty, hapus, kosongkan, miniBuka, miniTerakhir, tutupMini],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart harus dipakai di dalam <CartProvider>");
  return ctx;
}

/** Pasangkan baris keranjang dengan data produknya, buang yang produknya sudah hilang. */
export function resolveLines(lines: CartLine[], products: Product[]): ResolvedCartLine[] {
  return lines.flatMap((line) => {
    const product = products.find((p) => p.slug === line.slug);
    if (!product) return [];
    return [
      {
        product,
        qty: line.qty,
        lineTotal: product.price * line.qty,
        lineWeightGram: product.weightGram * line.qty,
      },
    ];
  });
}
