import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Panel admin", template: "%s — Panel admin Romlah" },
  // Panel admin tidak boleh muncul di mesin pencari.
  robots: { index: false, follow: false },
};

/**
 * Kerangka terluar admin. Sengaja tanpa penjaga sesi maupun sidebar:
 * halaman masuk dan penyiapan awal ada di bawah rute ini juga, dan
 * keduanya harus bisa dibuka tanpa sesi. Penjaganya ada di grup (panel).
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-screen bg-sunken">{children}</div>;
}
