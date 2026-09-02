"use client";

import { useEffect, useRef, useState } from "react";
import { catatInquiry } from "@/app/(toko)/lead-actions";

/**
 * Tombol WhatsApp — satu bentuk untuk seluruh situs.
 *
 * Menekannya TIDAK langsung membuka WhatsApp. Pengunjung mengisi nama dan
 * nomornya lebih dulu, datanya tersimpan sebagai prospek, baru percakapannya
 * dibuka. WhatsApp adalah kanal terbesar Romlah, dan sebelum ini setiap
 * pertanyaan yang masuk lewat sana tidak meninggalkan jejak apa pun.
 *
 * Tombol "Pesan lewat WhatsApp" di keranjang sengaja TIDAK memakai komponen
 * ini: yang itu sudah membuat pesanan sungguhan beserta barang dan ongkirnya.
 *
 * Tautannya dibuka lewat <a> yang benar-benar diklik pengunjung, bukan
 * window.open sesudah await — peramban memblokir jendela yang dibuka setelah
 * penantian asinkron.
 */

const SIMPANAN = "romlah-inquiry-v1";

type Props = {
  /** Teks awal kolom pertanyaan. Pengunjung boleh mengubahnya. */
  pesan?: string;
  /** Dari mana tombolnya ditekan — dicatat untuk pemasaran. */
  sumber?: "beranda" | "produk" | "toko" | "pesanan" | "footer" | "lain";
  /** Slug produk, bila tombolnya ada di halaman produk. */
  produkSlug?: string;
  children: React.ReactNode;
  /** "penuh" melebar mengikuti induknya; "inline" selebar isinya. */
  lebar?: "penuh" | "inline";
  /** "besar" untuk aksi utama, "kecil" untuk tombol di dalam kartu. */
  ukuran?: "besar" | "kecil";
  /**
   * "hijau" memakai gaya tombol WhatsApp bawaan.
   * "polos" menyerahkan seluruh penataan ke className pemanggil — dipakai
   * tombol mengambang dan tab di bilah bawah, yang bentuknya jauh berbeda
   * tapi harus memakai formulir prospek yang sama persis.
   */
  tampilan?: "hijau" | "polos";
  className?: string;
};

export function IkonWa({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.7 14.9L2 22l5.3-1.4A10 10 0 1 0 12 2Zm5.5 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-3.1-.7-2.6-1.1-4.3-3.8-4.4-4-.1-.2-1-1.4-1-2.6s.6-1.8.9-2.1c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.4.1.6-.1l.9-1c.2-.2.3-.2.6-.1l1.9.9c.3.1.5.2.5.4.1.1.1.7-.1 1.3Z" />
    </svg>
  );
}

const kelasInput =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

export function WaButton({
  pesan = "Halo Romlah, saya mau tanya-tanya soal oleh-oleh.",
  sumber = "lain",
  produkSlug,
  children,
  lebar = "penuh",
  ukuran = "besar",
  tampilan = "hijau",
  className = "",
}: Props) {
  const [buka, setBuka] = useState(false);
  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [isi, setIsi] = useState(pesan);
  const [mengirim, setMengirim] = useState(false);
  const [galat, setGalat] = useState("");
  const [tautan, setTautan] = useState("");
  const kolomPertama = useRef<HTMLInputElement>(null);

  /**
   * Buka panel, sekalian isikan data yang pernah diketik pengunjung ini.
   *
   * Pembacaannya di penangan klik, bukan di useEffect: localStorage tidak
   * ada saat render server, dan membacanya lewat efek berarti satu render
   * tambahan setiap kali panel dibuka.
   *
   * Yang tersimpan hanya di peramban pengunjung sendiri. Di server tetap
   * satu baris prospek baru untuk tiap pertanyaan, supaya riwayatnya utuh.
   */
  function bukaPanel() {
    try {
      const t = localStorage.getItem(SIMPANAN);
      if (t) {
        const d: unknown = JSON.parse(t);
        if (d && typeof d === "object") {
          const o = d as { nama?: string; telepon?: string; email?: string };
          if (o.nama) setNama((v) => v || o.nama!);
          if (o.telepon) setTelepon((v) => v || o.telepon!);
          if (o.email) setEmail((v) => v || o.email!);
        }
      }
    } catch {
      // Penyimpanan diblokir — formulirnya cuma mulai kosong.
    }
    setBuka(true);
  }

  useEffect(() => {
    if (!buka) return;
    kolomPertama.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buka]);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setGalat("");
    setMengirim(true);

    const hasil = await catatInquiry({
      nama,
      telepon,
      email: email || undefined,
      pesan: isi,
      sumber,
      produkSlug,
      halaman: window.location.pathname,
    });

    setMengirim(false);
    if (!hasil.ok) {
      setGalat(hasil.error);
      return;
    }

    try {
      localStorage.setItem(SIMPANAN, JSON.stringify({ nama, telepon, email }));
    } catch {
      // Tidak apa-apa; cuma kenyamanan untuk kunjungan berikutnya.
    }
    setTautan(hasil.tautanWa);
  }

  function tutup() {
    setBuka(false);
    // Dikembalikan ke keadaan awal supaya pertanyaan berikutnya tidak
    // membuka panel yang masih memperlihatkan hasil pertanyaan sebelumnya.
    setTautan("");
    setGalat("");
    setIsi(pesan);
  }

  const kelasTombol =
    tampilan === "polos"
      ? className
      : [
          "inline-flex items-center justify-center gap-2 rounded-xl bg-wa font-semibold text-wa-ink shadow-float transition hover:bg-wa-2",
          lebar === "penuh" ? "flex w-full" : "",
          ukuran === "besar" ? "px-6 py-3.5 text-sm" : "px-4 py-2 text-xs",
          className,
        ]
          .filter(Boolean)
          .join(" ");

  return (
    <>
      <button type="button" onClick={bukaPanel} className={kelasTombol}>
        {tampilan === "hijau" && <IkonWa className={ukuran === "besar" ? "h-4 w-4" : "h-3.5 w-3.5"} />}
        {children}
      </button>

      {buka && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Tutup"
            onClick={tutup}
            className="absolute inset-0 bg-ink/45"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-wa"
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-bg p-6 shadow-float sm:rounded-3xl"
          >
            {tautan ? (
              <div className="text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-pandan-soft text-pandan">
                  <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m4.5 12.5 5 5 10-11" />
                  </svg>
                </span>
                <h2 id="judul-wa" className="font-display mt-4 text-xl font-extrabold">
                  Data tersimpan
                </h2>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-2">
                  Pesannya sudah kami siapkan. Tekan tombol di bawah untuk melanjutkan ke WhatsApp.
                </p>

                <a
                  href={tautan}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={tutup}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-wa px-6 py-4 text-sm font-semibold text-wa-ink shadow-float transition hover:bg-wa-2"
                >
                  <IkonWa />
                  Lanjut ke WhatsApp
                </a>
                <button
                  type="button"
                  onClick={tutup}
                  className="mt-3 w-full rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
                >
                  Nanti saja
                </button>
              </div>
            ) : (
              <form onSubmit={kirim}>
                <h2 id="judul-wa" className="font-display text-xl font-extrabold">
                  Tanya lewat WhatsApp
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
                  Isi dulu sebentar biar kami tahu siapa yang bertanya dan bisa balas lebih cepat.
                </p>

                <div className="mt-5 space-y-3.5">
                  <label className="block">
                    <span className={kelasLabel}>Nama</span>
                    <input
                      ref={kolomPertama}
                      required
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama lengkap"
                      autoComplete="name"
                      className={`mt-1.5 ${kelasInput}`}
                    />
                  </label>

                  <label className="block">
                    <span className={kelasLabel}>Nomor WhatsApp</span>
                    <input
                      required
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      placeholder="08…"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      className={`mt-1.5 ${kelasInput}`}
                    />
                  </label>

                  <label className="block">
                    <span className={kelasLabel}>Email (opsional)</span>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buat kirim penawaran"
                      type="email"
                      autoComplete="email"
                      className={`mt-1.5 ${kelasInput}`}
                    />
                  </label>

                  <label className="block">
                    <span className={kelasLabel}>Pertanyaan</span>
                    <textarea
                      rows={3}
                      value={isi}
                      onChange={(e) => setIsi(e.target.value)}
                      className={`mt-1.5 ${kelasInput} resize-y leading-relaxed`}
                    />
                  </label>
                </div>

                {galat && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-xs text-ink-2"
                  >
                    {galat}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={mengirim}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-wa px-6 py-4 text-sm font-semibold text-wa-ink shadow-float transition hover:bg-wa-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <IkonWa />
                  {mengirim ? "Menyimpan…" : "Lanjut ke WhatsApp"}
                </button>
                <button
                  type="button"
                  onClick={tutup}
                  className="mt-2.5 w-full rounded-xl border border-line-2 px-5 py-3 text-sm font-semibold transition hover:bg-sunken"
                >
                  Batal
                </button>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-muted">
                  Data ini kami simpan untuk membalas pertanyaan Anda dan mengabari penawaran
                  Romlah. Tidak dibagikan ke pihak lain.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
