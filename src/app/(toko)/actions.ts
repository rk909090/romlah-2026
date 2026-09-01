"use server";

import { SITE } from "@/data/site";
import { rupiah } from "@/lib/format";
import { execute } from "@/lib/db";
import { buatTransaksiSnap, midtransAktif, MidtransError } from "@/lib/midtrans";
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

/* ── Bayar sekarang lewat Midtrans ─────────────────────────────────── */
export type HasilBayar = { ok: true; redirectUrl: string; orderNumber: string } | { ok: false; error: string };

export async function bayarSekarang(masuk: PesananMasuk): Promise<HasilBayar> {
  if (!midtransAktif()) {
    return { ok: false, error: "Pembayaran online belum aktif. Silakan pesan lewat WhatsApp." };
  }

  let pesanan: PesananTersimpan;
  try {
    pesanan = await simpanPesanan({ ...masuk, channel: "web" });
  } catch (e) {
    console.error("[bayarSekarang/simpan]", e);
    const pesan =
      e instanceof Error && e.message && !/^(ER_|ECONN|ETIMEDOUT)/.test(e.message)
        ? e.message
        : "Pesanan gagal disimpan. Coba lagi sebentar lagi.";
    return { ok: false, error: pesan };
  }

  // Midtrans menolak transaksi bila jumlah item_details tidak sama persis
  // dengan gross_amount, jadi ongkir ikut jadi satu baris.
  const items = pesanan.items.map((i, n) => ({
    id: `item-${n + 1}`,
    name: i.name.slice(0, 50),
    price: i.unitPrice,
    quantity: i.qty,
  }));
  if (pesanan.shippingCost > 0) {
    items.push({
      id: "ongkir",
      name: `Ongkir ${pesanan.kurir} ${pesanan.layanan}`.slice(0, 50),
      price: pesanan.shippingCost,
      quantity: 1,
    });
  }

  try {
    const { redirectUrl } = await buatTransaksiSnap({
      orderId: pesanan.orderNumber,
      grossAmount: pesanan.total,
      items,
      nama: masuk.nama.trim(),
      telepon: masuk.telepon.trim(),
      // Midtrans mengirim struk ke email ini bila ada.
      email: pesanan.email,
    });

    await execute(`UPDATE orders SET midtrans_order_id = ? WHERE id = ?`, [
      pesanan.orderNumber,
      pesanan.orderId,
    ]);

    return { ok: true, redirectUrl, orderNumber: pesanan.orderNumber };
  } catch (e) {
    console.error("[bayarSekarang/midtrans]", e);
    // Pesanannya sudah tersimpan, jadi pembeli tidak kehilangan apa pun —
    // ia bisa melanjutkan lewat WhatsApp memakai nomor yang sama.
    const pesan =
      e instanceof MidtransError
        ? `${e.message} Pesanan Anda tetap tersimpan dengan nomor ${pesanan.orderNumber}.`
        : `Pembayaran gagal dimulai. Pesanan Anda tersimpan dengan nomor ${pesanan.orderNumber}.`;
    return { ok: false, error: pesan };
  }
}
