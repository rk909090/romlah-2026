import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { FormCheckout } from "@/components/admin/settings-forms";
import { midtransAktif } from "@/lib/midtrans";
import { getPengaturan } from "@/lib/settings";

export const metadata = { title: "Tombol checkout" };
export const dynamic = "force-dynamic";

export default async function AturCheckout() {
  const set = await getPengaturan();

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Tombol checkout" />
      <AdminHeading
        title="Tombol checkout"
        description="Menentukan jalan keluar apa saja yang tersedia di halaman keranjang."
      />
      <FormCheckout nilai={set.checkout} bayarAktif={midtransAktif()} />
    </>
  );
}
