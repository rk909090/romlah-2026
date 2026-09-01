import { AdminHeading } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { listCategories } from "@/lib/admin/products";

export const metadata = { title: "Produk baru" };

export default async function ProdukBaru() {
  const kategori = await listCategories();

  return (
    <>
      <AdminHeading title="Produk baru" description="Slug terisi otomatis dari nama, dan bisa diubah." />
      <ProductForm kategori={kategori} foto={[]} />
    </>
  );
}
