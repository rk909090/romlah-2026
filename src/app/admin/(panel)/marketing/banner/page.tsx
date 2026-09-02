import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { FormBanner } from "@/components/admin/settings-forms";
import { getPengaturan } from "@/lib/settings";

export const metadata = { title: "Banner pengumuman" };
export const dynamic = "force-dynamic";

export default async function AturBanner() {
  const set = await getPengaturan();

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Banner pengumuman" />
      <AdminHeading
        title="Banner pengumuman"
        description="Satu baris tipis di paling atas seluruh halaman toko. Cocok untuk mengumumkan program yang sedang berjalan."
      />
      <FormBanner nilai={set.banner} />
    </>
  );
}
