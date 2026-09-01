import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { adaAdmin, getCurrentUser } from "@/lib/auth";

/**
 * Penjaga sesi untuk seluruh halaman panel.
 *
 * Dilakukan di layout, bukan middleware, supaya pemeriksaannya berjalan di
 * runtime Node dan bisa langsung menanyakan basis data. Setiap halaman di
 * bawahnya sudah pasti punya pengguna yang sah.
 */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await getCurrentUser();

  if (!user) {
    // Basis data yang masih kosong diarahkan ke penyiapan, bukan ke halaman
    // masuk yang tidak mungkin bisa dilewati siapa pun.
    redirect((await adaAdmin()) ? "/admin/login" : "/admin/setup");
  }

  return <AdminShell user={user}>{children}</AdminShell>;
}
