import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/admin-shell";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, getProductImages, listCategories } from "@/lib/admin/products";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await getAdminProduct(Number(id));
  return { title: p ? `Ubah ${p.name}` : "Produk tidak ditemukan" };
}

export default async function UbahProduk({ params }: Props) {
  const { id } = await params;
  const idAngka = Number(id);
  if (!Number.isInteger(idAngka)) notFound();

  const [produk, kategori] = await Promise.all([getAdminProduct(idAngka), listCategories()]);
  if (!produk) notFound();

  const foto = await getProductImages(produk.id);

  return (
    <>
      <AdminHeading
        title={produk.name}
        description={`Terakhir diubah ${new Date(produk.updatedAt).toLocaleString("id-ID")}`}
      />
      <ProductForm produk={produk} kategori={kategori} foto={foto} />
    </>
  );
}
