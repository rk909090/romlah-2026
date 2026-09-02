import { AdminHeading } from "@/components/admin/admin-shell";
import { PackageForm } from "@/components/admin/package-form";
import { listCalonIsi } from "@/lib/admin/packages";

export const metadata = { title: "Paket baru" };
export const dynamic = "force-dynamic";

export default async function PaketBaru() {
  const calon = await listCalonIsi();

  return (
    <>
      <AdminHeading
        title="Paket baru"
        description="Pilih isinya, beratnya dihitung sendiri. Harga tetap diisi tangan supaya potongannya bisa ditentukan."
      />
      <PackageForm calon={calon} />
    </>
  );
}
