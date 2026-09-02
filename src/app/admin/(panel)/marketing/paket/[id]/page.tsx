import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeading } from "@/components/admin/admin-shell";
import { PackageForm } from "@/components/admin/package-form";
import { getIsiPaket, getPaket, listCalonIsi } from "@/lib/admin/packages";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await getPaket(Number(id));
  return { title: p ? `Ubah ${p.name}` : "Paket tidak ditemukan" };
}

export default async function UbahPaket({ params }: Props) {
  const { id } = await params;
  const idAngka = Number(id);
  if (!Number.isInteger(idAngka)) notFound();

  const paket = await getPaket(idAngka);
  if (!paket) notFound();

  const [isi, calon] = await Promise.all([getIsiPaket(paket.id), listCalonIsi()]);

  return (
    <>
      <nav className="mb-4 text-sm text-muted">
        <Link href="/admin/marketing" className="hover:text-jingga">
          Marketing
        </Link>
        <span className="px-1.5">/</span>
        <span className="text-ink-2">{paket.name}</span>
      </nav>

      <AdminHeading
        title={paket.name}
        description={
          paket.dipakaiPesanan > 0
            ? `Sudah masuk ${paket.dipakaiPesanan} baris pesanan — menghapusnya hanya akan mengarsipkan.`
            : `Terakhir diubah ${new Date(paket.updatedAt).toLocaleString("id-ID")}`
        }
      />

      <PackageForm
        paket={{
          id: paket.id,
          slug: paket.slug,
          name: paket.name,
          price: paket.price,
          weightGram: paket.weightGram,
          description: paket.description,
          inStock: paket.inStock,
          isActive: paket.isActive,
          isi: isi.map((i) => ({ productId: i.productId, qty: i.qty })),
        }}
        calon={calon}
      />
    </>
  );
}
