import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { PromoForm } from "@/components/admin/promo-form";
import { getPromo } from "@/lib/admin/promo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await getPromo(Number(id));
  return { title: p ? `Ubah ${p.code}` : "Kode promo tidak ditemukan" };
}

export default async function UbahPromo({ params }: Props) {
  const { id } = await params;
  const idAngka = Number(id);
  if (!Number.isInteger(idAngka)) notFound();

  const promo = await getPromo(idAngka);
  if (!promo) notFound();

  return (
    <>
      <Breadcrumb induk="Kode promo" hrefInduk="/admin/marketing/promo" kini={promo.code} />
      <AdminHeading
        title={promo.code}
        description={
          promo.terpakai > 0
            ? `Sudah ditebus ${promo.terpakai} kali. Menghapusnya hanya akan menonaktifkan.`
            : "Belum pernah ditebus."
        }
      />
      <PromoForm promo={promo} />
    </>
  );
}
