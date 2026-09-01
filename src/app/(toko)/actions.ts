"use server";

import { SITE } from "@/data/site";
import { rupiah } from "@/lib/format";
import { simpanPesanan, type PesananMasuk, type PesananTersimpan } from "@/lib/orders";

export type HasilPesanan =
  | { ok: true; pesanan: PesananTersimpan; pesan: string; tautanWa: string }
  | { ok: false; error: string };

/**
 * Susun pesan WhatsApp dari angka yang SUDAH disimpan server.
 *
 * Sengaja dibuat di sini, bukan di browser: pesan yang dikirim pembeli harus
 * sama persis dengan yang tercatat di basis data. Kalau disusun di klien,
 * keduanya bisa berbeda tanpa ada yang menyadarinya.
 */
function susunPesan(p: PesananTersimpan, nama: string, telepon: string, alamat: string): string {
  const barang = p.items.map((i) => `${i.qty}× ${i.name} — ${rupiah(i.lineTotal)}`).join("\n");
  const kirim =
    p.kurir === "Ambil di toko"
      ? "Ambil sendiri di toko Tanjung Barat"
      : `${p.kurir} ${p.layanan} — ${p.shippingCost === 0 ? "Gratis ongkir" : rupiah(p.shippingCost)}`;

  const tujuan = [nama + " · " + telepon, alamat.trim(), p.destinationLabel ?? ""].filter(
    (b) => b.length > 0,
  );

  return [
    "Halo Romlah, saya mau pesan:",
    "",
    `No. Pesanan: ${p.orderNumber}`,
    "",
    barang,
    "",
    `Subtotal: ${rupiah(p.subtotal)}`,
    `Pengiriman: ${kirim}`,
    `Total: ${rupiah(p.total)}`,
    "",
    "Kirim ke:",
    ...tujuan,
    "",
    `${SITE.url}/pesanan/${p.orderNumber}`,
  ].join("\n");
}

export async function buatPesanan(masuk: PesananMasuk): Promise<HasilPesanan> {
  try {
    const pesanan = await simpanPesanan(masuk);
    const pesan = susunPesan(pesanan, masuk.nama.trim(), masuk.telepon.trim(), masuk.alamat);
    return {
      ok: true,
      pesanan,
      pesan,
      tautanWa: `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(pesan)}`,
    };
  } catch (e) {
    // Pesan dari simpanPesanan memang ditujukan untuk pembeli; galat lain
    // tidak boleh bocor ke layar karena bisa memuat detail basis data.
    const pesan =
      e instanceof Error && e.message && !/^(ER_|ECONN|ETIMEDOUT)/.test(e.message)
        ? e.message
        : "Pesanan gagal disimpan. Coba lagi sebentar lagi.";
    console.error("[buatPesanan]", e);
    return { ok: false, error: pesan };
  }
}
