import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { PromoForm } from "@/components/admin/promo-form";

export const metadata = { title: "Kode promo baru" };
export const dynamic = "force-dynamic";

export default function PromoBaru() {
  return (
    <>
      <Breadcrumb induk="Kode promo" hrefInduk="/admin/marketing/promo" kini="Baru" />
      <AdminHeading
        title="Kode promo baru"
        description="Potongannya dihitung ulang di server saat pesanan disimpan — angka yang dikirim peramban tidak pernah dipercaya."
      />
      <PromoForm />
    </>
  );
}
