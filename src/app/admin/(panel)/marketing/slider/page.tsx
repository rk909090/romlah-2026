import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { SliderForm } from "@/components/admin/slider-form";
import { getPengaturan } from "@/lib/settings";

export const metadata = { title: "Slider beranda" };
export const dynamic = "force-dynamic";

export default async function AturSlider() {
  const set = await getPengaturan();

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Slider beranda" />
      <AdminHeading
        title="Slider beranda"
        description="Banner 16:9 di paling atas beranda, tepat di bawah menu. Bisa digeser jari di ponsel."
      />
      <SliderForm nilai={set.slider} />
    </>
  );
}
