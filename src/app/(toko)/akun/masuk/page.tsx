import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormAkunMasuk } from "@/components/akun-forms";
import { getPelangganSaatIni } from "@/lib/akun";

export const metadata: Metadata = {
  title: "Masuk akun",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function MasukAkun() {
  // Yang sudah masuk tidak perlu melihat formulirnya lagi.
  if (await getPelangganSaatIni()) redirect("/akun");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display mb-2 text-center text-3xl font-extrabold tracking-tight">Akun saya</h1>
      <p className="mx-auto mb-8 max-w-sm text-center text-sm leading-relaxed text-ink-2">
        Masuk untuk melihat riwayat pesanan, status pengiriman, dan alamat yang tersimpan.
      </p>
      <FormAkunMasuk />
    </div>
  );
}
