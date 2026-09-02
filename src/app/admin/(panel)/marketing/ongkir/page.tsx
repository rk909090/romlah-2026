import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { FormGratisOngkir } from "@/components/admin/settings-forms";
import { getPengaturan } from "@/lib/settings";

export const metadata = { title: "Kirim gratis" };
export const dynamic = "force-dynamic";

export default async function AturOngkir() {
  const set = await getPengaturan();

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Kirim gratis" />
      <AdminHeading
        title="Kirim gratis"
        description="Berlaku di halaman keranjang, dan dihitung ulang di server saat pesanan disimpan — angka di layar tidak mungkin berbeda dari yang ditagihkan."
      />
      <FormGratisOngkir nilai={set.gratisOngkir} />
    </>
  );
}
