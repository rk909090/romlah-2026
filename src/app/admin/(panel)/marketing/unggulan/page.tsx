import { AdminHeading } from "@/components/admin/admin-shell";
import { Breadcrumb } from "@/components/admin/breadcrumb";
import { FeaturedForm } from "@/components/admin/featured-form";
import { listProducts, listUnggulan } from "@/lib/admin/products";

export const metadata = { title: "Produk unggulan" };
export const dynamic = "force-dynamic";

/** Beranda memanggil getFeatured(8); angkanya disamakan di sini. */
const TAMPIL_DI_BERANDA = 8;

export default async function Unggulan() {
  const [semua, terpilih] = await Promise.all([
    listProducts({ status: "aktif" }),
    listUnggulan(),
  ]);

  // Paket tidak ikut: beranda punya baris "Paket hemat" tersendiri, dan
  // getFeatured juga mengecualikannya pada urutan otomatis.
  const calon = semua
    .filter((p) => p.categorySlug !== "paket")
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      firstImage: p.firstImage,
      inStock: p.inStock,
      categoryName: p.categoryName,
    }));

  return (
    <>
      <Breadcrumb induk="Marketing" hrefInduk="/admin/marketing" kini="Produk unggulan" />
      <AdminHeading
        title="Produk unggulan"
        description={`Baris "Sering jadi pilihan" di beranda. Sebelum ini urutannya berdasarkan kelengkapan foto, yang tidak ada hubungannya dengan apa yang ingin dijual.`}
      />
      <FeaturedForm
        calon={calon}
        awal={terpilih.map((u) => u.id)}
        batas={TAMPIL_DI_BERANDA}
      />
    </>
  );
}
