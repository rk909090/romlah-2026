"use server";

import { SITE } from "@/data/site";
import { simpanLead, type LeadMasuk } from "@/lib/leads";

export type HasilLead = { ok: true; tautanWa: string } | { ok: false; error: string };

/**
 * Catat pertanyaan dari tombol WhatsApp, lalu kembalikan tautan percakapannya.
 *
 * Tautannya dibuat DI SERVER, bukan di peramban: nomor tujuan dan isi pesan
 * harus sama dengan yang tercatat di basis data. Kalau disusun di klien,
 * keduanya bisa berbeda tanpa ada yang tahu.
 */
export async function catatInquiry(masuk: LeadMasuk): Promise<HasilLead> {
  try {
    await simpanLead(masuk);
  } catch (e) {
    console.error("[catatInquiry]", e);
    // Galat validasi memang ditujukan untuk pengunjung; galat basis data
    // tidak boleh sampai ke layar karena bisa memuat nama tabel dan kolom.
    const pesan =
      e instanceof Error && e.message && !/^(ER_|ECONN|ETIMEDOUT)/.test(e.message)
        ? e.message
        : "Data gagal disimpan. Coba lagi sebentar lagi.";
    return { ok: false, error: pesan };
  }

  const isi = masuk.pesan?.trim() || "Halo Romlah, saya mau tanya-tanya.";
  const pesan = `${isi}\n\n— ${masuk.nama.trim()}`;

  return {
    ok: true,
    tautanWa: `https://wa.me/${SITE.whatsapp.number}?text=${encodeURIComponent(pesan)}`,
  };
}
