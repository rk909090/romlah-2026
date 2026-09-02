"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { bayarSekarang, buatPesanan, type HasilPesanan } from "@/app/(toko)/actions";
import { berat, rupiah } from "@/lib/format";
import {
  kurangGratisOngkir,
  memenuhiGratisOngkir,
  ongkirSetelahProgram,
  type GratisOngkir,
} from "@/lib/promo";
import type { Destination, ShippingRate } from "@/lib/shipping";
import type { Product } from "@/lib/types";
import { resolveLines, useCart } from "./cart-provider";
import { IkonWa } from "./wa-button";

type Tahap = "keranjang" | "konfirmasi";

export function CartView({
  products,
  bayarAktif,
  ongkirContoh,
  gratisOngkir,
  tombolWa,
}: {
  products: Product[];
  bayarAktif: boolean;
  /** true bila kredensial Biteship belum lengkap, sehingga tarif masih contoh. */
  ongkirContoh: boolean;
  /** Program gratis ongkir, dari panel admin. */
  gratisOngkir: GratisOngkir;
  /** Tampilkan tombol "Pesan lewat WhatsApp". Diatur dari panel admin. */
  tombolWa: boolean;
}) {
  const { lines, ready, ubahQty, hapus, kosongkan } = useCart();
  const items = useMemo(() => resolveLines(lines, products), [lines, products]);

  const subtotal = items.reduce((n, l) => n + l.lineTotal, 0);
  const beratTotal = items.reduce((n, l) => n + l.lineWeightGram, 0);

  const [q, setQ] = useState("");
  const [hasil, setHasil] = useState<Destination[]>([]);
  const [tujuan, setTujuan] = useState<Destination | null>(null);
  const [tarif, setTarif] = useState<ShippingRate[]>([]);
  const [pilihTarif, setPilihTarif] = useState<ShippingRate | null>(null);
  const [tarifContoh, setTarifContoh] = useState(false);
  const [galatOngkir, setGalatOngkir] = useState("");
  const [memuat, setMemuat] = useState(false);

  const [nama, setNama] = useState("");
  const [telepon, setTelepon] = useState("");
  const [email, setEmail] = useState("");
  const [alamat, setAlamat] = useState("");
  const [tahap, setTahap] = useState<Tahap>("keranjang");
  const [pesanan, setPesanan] = useState<Extract<HasilPesanan, { ok: true }> | null>(null);
  const [galat, setGalat] = useState("");
  const [mengirim, setMengirim] = useState(false);
  const [membayar, setMembayar] = useState(false);

  /** Ketikan baru berarti tujuan lama tidak berlaku lagi — dibereskan di sini,
   *  di penangan peristiwa, bukan lewat effect. */
  function ketikTujuan(nilai: string) {
    setQ(nilai);
    setTujuan(null);
    setTarif([]);
    setPilihTarif(null);
    if (nilai.trim().length < 3) setHasil([]);
  }

  // Pencarian tujuan, ditahan sebentar supaya tidak memanggil tiap ketukan.
  useEffect(() => {
    if (q.trim().length < 3) return;
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/ongkir/tujuan?q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setHasil(j.data ?? []);
        setGalatOngkir(j.error ?? "");
      } catch {
        setHasil([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  // Tarif dihitung ulang setiap tujuan atau berat keranjang berubah.
  useEffect(() => {
    if (!tujuan || beratTotal <= 0) return;
    let batal = false;
    (async () => {
      setMemuat(true);
      try {
        const r = await fetch("/api/ongkir/tarif", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tujuan, beratGram: beratTotal }),
        });
        const j = await r.json();
        if (batal) return;
        setTarif(j.data ?? []);
        setTarifContoh(Boolean(j.contoh));
        setGalatOngkir(j.error ?? "");
        setPilihTarif(j.data?.[0] ?? null);
      } catch {
        if (!batal) {
          setTarif([]);
          setGalatOngkir("Perhitungan ongkir sedang bermasalah. Coba lagi sebentar lagi.");
        }
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
  }, [tujuan, beratTotal]);

  const kelasInput =
    "mt-1.5 w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm focus:border-jingga focus:outline-none";
  const kelasLabel = "text-xs font-semibold tracking-wide text-muted uppercase";

  // Dihitung lewat fungsi yang sama persis dengan yang dipakai server saat
  // menyimpan pesanan, jadi angka di layar tidak mungkin berbeda dari yang
  // ditagihkan.
  const ongkir = pilihTarif
    ? ongkirSetelahProgram(pilihTarif.cost, subtotal, gratisOngkir, pilihTarif.code === "pickup")
    : 0;
  const total = subtotal + ongkir;
  const kurang = kurangGratisOngkir(subtotal, gratisOngkir);
  const sudahGratis = memenuhiGratisOngkir(subtotal, gratisOngkir);

  // Alamat lengkap wajib untuk pengiriman kurir: tanpa nama jalan, paketnya
  // tidak bisa diantar. Ambil di toko tidak memerlukannya.
  const perluAlamat = pilihTarif?.code !== "pickup";
  const bisaPesan = Boolean(
    items.length > 0 &&
      tujuan &&
      pilihTarif &&
      nama.trim() &&
      telepon.trim() &&
      (!perluAlamat || alamat.trim()),
  );

  // Nama "kurang" sudah dipakai untuk selisih gratis ongkir di atas.
  const belumLengkap: string[] = [];
  if (!nama.trim()) belumLengkap.push("nama");
  if (!telepon.trim()) belumLengkap.push("WhatsApp");
  if (perluAlamat && !alamat.trim()) belumLengkap.push("alamat lengkap");
  if (!tujuan) belumLengkap.push("kecamatan atau kode pos");
  else if (!pilihTarif) belumLengkap.push("pilihan kurir");

  async function kirimPesanan() {
    if (!bisaPesan || mengirim) return;
    setMengirim(true);
    setGalat("");
    const r = await buatPesanan({
      items: lines,
      nama,
      telepon,
      email,
      alamat,
      tujuan,
      kurirKode: pilihTarif!.code,
      kurirLayanan: pilihTarif!.service,
    });
    setMengirim(false);

    if (!r.ok) {
      setGalat(r.error);
      return;
    }
    setPesanan(r);
    setTahap("konfirmasi");
    // Keranjang dikosongkan begitu pesanan tersimpan. Tanpa ini, menekan
    // kembali lalu memesan lagi akan membuat pesanan kedua yang sama.
    kosongkan();
  }

  async function bayar() {
    if (!bisaPesan || membayar || mengirim) return;
    setMembayar(true);
    setGalat("");
    const r = await bayarSekarang({
      items: lines,
      nama,
      telepon,
      email,
      alamat,
      tujuan,
      kurirKode: pilihTarif!.code,
      kurirLayanan: pilihTarif!.service,
    });

    if (!r.ok) {
      setMembayar(false);
      setGalat(r.error);
      return;
    }
    // Keranjang dikosongkan sebelum berpindah: pesanannya sudah tersimpan,
    // dan kembali ke halaman ini tidak boleh membuat pesanan kedua.
    kosongkan();
    window.location.href = r.redirectUrl;
  }

  if (!ready) {
    return <div className="py-20 text-center text-sm text-muted">Memuat keranjang…</div>;
  }

  if (items.length === 0 && tahap === "keranjang") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-12 text-center">
        <p className="font-display text-xl font-bold">Keranjang masih kosong</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-2">
          Pilih dulu camilannya, ongkir dihitung setelah alamat diisi.
        </p>
        <Link
          href="/katalog"
          className="mt-6 inline-block rounded-xl bg-jingga px-6 py-3.5 text-sm font-semibold text-jingga-ink"
        >
          Lihat katalog
        </Link>
      </div>
    );
  }

  /* ── Layar konfirmasi: pesanan SUDAH tersimpan di basis data ────── */
  if (tahap === "konfirmasi" && pesanan) {
    const p = pesanan.pesanan;
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-pandan bg-pandan-soft p-6 text-center">
          <p className="font-display text-xl font-bold">Pesanan tersimpan</p>
          <p className="tabular mt-2 text-lg font-bold text-jingga">{p.orderNumber}</p>
          <p className="mt-3 text-sm text-ink-2">
            Sebutkan nomor ini saat berbalas pesan supaya admin langsung menemukan pesanan Anda.
          </p>
        </div>

        <dl className="mt-5 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line bg-surface p-5 text-sm">
          <dt className="text-ink-2">Subtotal · {berat(p.weightGram)}</dt>
          <dd className="tabular text-right font-medium">{rupiah(p.subtotal)}</dd>
          <dt className="text-ink-2">
            {p.kurir} {p.layanan !== p.kurir && p.layanan}
          </dt>
          <dd className="tabular text-right font-medium">
            {p.shippingCost === 0 ? "Gratis" : rupiah(p.shippingCost)}
          </dd>
          <dt className="border-t border-line pt-2 font-bold">Total</dt>
          <dd className="tabular border-t border-line pt-2 text-right font-bold">{rupiah(p.total)}</dd>
        </dl>

        <h2 className="mt-7 text-xs font-semibold tracking-widest text-muted uppercase">
          Pesan yang akan terkirim
        </h2>
        <pre className="mt-2 overflow-x-auto rounded-2xl border border-line bg-surface p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-ink-2">
          {pesanan.pesan}
        </pre>

        <a
          href={pesanan.tautanWa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-wa px-6 py-4 text-center text-sm font-semibold text-wa-ink shadow-float transition hover:bg-wa-2"
        >
          <IkonWa />
          Buka WhatsApp
        </a>
        <Link
          href={`/pesanan/${p.orderNumber}`}
          className="mt-3 block rounded-xl border border-line-2 px-6 py-3.5 text-center text-sm font-semibold transition hover:bg-sunken"
        >
          Lihat status pesanan
        </Link>
        <Link href="/katalog" className="mt-4 block text-center text-xs text-muted underline underline-offset-2">
          Belanja lagi
        </Link>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          Pesanan sudah tercatat meski WhatsApp gagal terbuka. Simpan nomornya untuk membuka
          halaman status kapan saja.
        </p>
      </div>
    );
  }

  /* ── Keranjang ──────────────────────────────────────────────────── */
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
      {/* Kiri: isi keranjang + alamat */}
      <div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((l) => (
            <li key={l.product.slug} className="flex gap-4 p-4">
              <Link
                href={`/produk/${l.product.slug}`}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-sunken"
              >
                {l.product.images[0] && (
                  <Image src={l.product.images[0].src} alt="" fill sizes="80px" className="object-cover" />
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/produk/${l.product.slug}`} className="text-sm font-semibold">
                  {l.product.name}
                </Link>
                <p className="mt-0.5 text-xs text-muted">{berat(l.product.weightGram)} / pcs</p>

                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-lg border border-line-2">
                    <button
                      type="button"
                      onClick={() => ubahQty(l.product.slug, l.qty - 1)}
                      aria-label={`Kurangi ${l.product.name}`}
                      className="grid h-8 w-8 place-items-center transition hover:text-jingga"
                    >
                      −
                    </button>
                    <span className="tabular w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => ubahQty(l.product.slug, l.qty + 1)}
                      aria-label={`Tambah ${l.product.name}`}
                      className="grid h-8 w-8 place-items-center transition hover:text-jingga"
                    >
                      +
                    </button>
                  </div>
                  <p className="tabular text-sm font-bold">{rupiah(l.lineTotal)}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => hapus(l.product.slug)}
                aria-label={`Hapus ${l.product.name}`}
                className="self-start text-xs text-muted transition hover:text-jingga"
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>

        {/* Alamat & ongkir */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-bold">Alamat pengiriman</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={kelasLabel}>Nama penerima</span>
              <input
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                autoComplete="name"
                className={kelasInput}
                placeholder="Nama lengkap"
              />
            </label>
            <label className="block">
              <span className={kelasLabel}>Nomor WhatsApp</span>
              <input
                value={telepon}
                onChange={(e) => setTelepon(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                className={kelasInput}
                placeholder="08…"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className={kelasLabel}>
              Email <span className="normal-case">(opsional)</span>
            </span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              className={kelasInput}
              placeholder="untuk struk pembayaran"
            />
          </label>

          {/* Alamat lengkap tidak lagi disembunyikan sampai tujuan dipilih.
              Sebelumnya kolom ini baru muncul setelah kelurahan dipilih, dan
              pembeli yang pencariannya gagal tidak pernah melihatnya. */}
          <label className="mt-3 block">
            <span className={kelasLabel}>Alamat lengkap</span>
            <textarea
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              rows={3}
              autoComplete="street-address"
              className={`${kelasInput} resize-y`}
              placeholder="Nama jalan, nomor rumah, RT/RW, patokan"
            />
          </label>

          <label className="mt-3 block">
            <span className={kelasLabel}>Kecamatan atau kode pos</span>
            <input
              value={tujuan ? tujuan.label : q}
              onChange={(e) => ketikTujuan(e.target.value)}
              className={kelasInput}
              placeholder="Ketik kode pos, misalnya 12730"
            />
            <span className="mt-1.5 block text-xs text-muted">
              Cari dengan kode pos. Pilih satu hasil untuk memunculkan pilihan kurir.
            </span>
          </label>

          {!tujuan && hasil.length > 0 && (
            <ul className="mt-2 overflow-hidden rounded-xl border border-line">
              {hasil.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTujuan(d);
                      setHasil([]);
                    }}
                    className="block w-full border-b border-line px-4 py-3 text-left text-xs leading-relaxed transition last:border-0 hover:bg-sunken"
                  >
                    {d.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Galat ongkir ditampilkan di sini, bukan di dalam blok pilihan
              kurir. Sebelumnya elemen ini berada di dalam blok yang baru
              muncul setelah tujuan dipilih, sehingga kegagalan pencarian
              tampil sebagai kesunyian total. */}
          {galatOngkir && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-jingga/40 bg-jingga-soft p-3 text-xs leading-relaxed text-ink-2"
            >
              {galatOngkir}
            </p>
          )}

          {/* Tanpa ini, pencarian yang tidak menemukan apa pun hanya diam. */}
          {!tujuan && q.trim().length >= 3 && hasil.length === 0 && !galatOngkir && (
            <p className="mt-2 rounded-xl border border-line bg-sunken p-3 text-xs leading-relaxed text-ink-2">
              Tidak ada wilayah yang cocok dengan “{q.trim()}”.{" "}
              {ongkirContoh
                ? "Layanan ongkir belum tersambung, jadi baru sedikit wilayah yang bisa dicari."
                : "Coba kode pos lima angka, misalnya 12730."}
            </p>
          )}

          {ongkirContoh && (
            <p className="mt-3 rounded-xl border border-warn/40 bg-warn-soft p-3 text-xs leading-relaxed text-ink-2">
              <b>Ongkir belum tersambung.</b> Kredensial Biteship belum disetel di server, jadi hanya
              beberapa wilayah contoh yang bisa dicari dan tarifnya bukan tarif sungguhan. Pesanan tetap
              bisa diselesaikan lewat WhatsApp.
            </p>
          )}

          {tujuan && (
            <div className="mt-5">
              <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">
                Pengiriman untuk {berat(beratTotal)}
              </h3>
              {memuat ? (
                <p className="mt-3 text-sm text-muted">Menghitung ongkir…</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {tarif.map((t) => {
                    const aktif = pilihTarif?.code === t.code && pilihTarif?.service === t.service;
                    const gratis = gratisOngkir && t.code !== "pickup";
                    return (
                      <li key={`${t.code}-${t.service}`}>
                        <button
                          type="button"
                          onClick={() => setPilihTarif(t)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                            aktif ? "border-jingga bg-jingga-soft" : "border-line hover:border-line-2"
                          }`}
                        >
                          <span>
                            <span className="block text-sm font-semibold">
                              {t.name} {t.service !== t.name && t.service}
                            </span>
                            <span className="block text-xs text-muted">
                              {t.description} · {t.etd}
                            </span>
                          </span>
                          {/* Saat gratis ongkir aktif, tarif asli tetap ditampilkan
                              dicoret supaya pembeli tahu berapa yang dihemat. */}
                          <span className="tabular flex shrink-0 items-baseline gap-2 text-sm font-bold">
                            {gratis && t.cost > 0 && (
                              <s className="font-medium text-muted">{rupiah(t.cost)}</s>
                            )}
                            <span className={t.cost === 0 || gratis ? "text-pandan" : ""}>
                              {t.cost === 0 || gratis ? "Gratis" : rupiah(t.cost)}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {tarifContoh && (
                <p className="mt-3 rounded-xl border border-warn/40 bg-warn-soft p-3 text-xs leading-relaxed text-ink-2">
                  <b>Tarif contoh.</b> Angka ini belum berasal dari Biteship — kredensial ongkir belum lengkap. Alur dan
                  tampilannya sudah final.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Kanan: ringkasan */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-bold">Ringkasan</h2>

          {/* Ajakan gratis ongkir hanya muncul kalau programnya memang nyala. */}
          {gratisOngkir.aktif && !sudahGratis && (
            <div className="mt-4 rounded-xl bg-jingga-soft p-3.5">
              <p className="text-xs font-medium text-jingga">
                {gratisOngkir.pesan || `Tambah ${rupiah(kurang)} lagi untuk gratis ongkir`}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-jingga transition-all"
                  style={{
                    width: `${Math.min(100, gratisOngkir.minBelanja > 0 ? (subtotal / gratisOngkir.minBelanja) * 100 : 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {gratisOngkir.aktif && sudahGratis && (
            <p className="mt-4 rounded-xl bg-pandan-soft px-3.5 py-3 text-xs font-medium text-pandan">
              {gratisOngkir.maksPotongan > 0
                ? `Ongkir ditanggung sampai ${rupiah(gratisOngkir.maksPotongan)}`
                : "Belanja ini sudah gratis ongkir"}
            </p>
          )}

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-2">Subtotal · {berat(beratTotal)}</dt>
              <dd className="tabular font-medium">{rupiah(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-2">Ongkir</dt>
              <dd className="tabular font-medium">
                {!pilihTarif ? <span className="text-muted">Isi alamat dulu</span> : ongkir === 0 ? "Gratis" : rupiah(ongkir)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular">{rupiah(total)}</dd>
            </div>
          </dl>

          {/* Dua jalur setara — WhatsApp adalah kanal terbesar Romlah. */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              disabled={!bayarAktif || !bisaPesan || membayar || mengirim}
              onClick={bayar}
              title={bayarAktif ? undefined : "Aktif setelah kunci Midtrans dipasang"}
              className="w-full rounded-xl bg-jingga px-5 py-4 text-sm font-semibold text-jingga-ink shadow-float transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {membayar ? "Menyiapkan pembayaran…" : "Bayar sekarang · QRIS, VA, kartu"}
            </button>
            {tombolWa && (
              <button
                type="button"
                disabled={!bisaPesan || mengirim}
                onClick={kirimPesanan}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-wa px-5 py-4 text-sm font-semibold text-wa-ink shadow-float transition hover:bg-wa-2 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <IkonWa />
                {mengirim ? "Menyimpan pesanan…" : "Pesan lewat WhatsApp"}
              </button>
            )}

            {galat && (
              <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-xs text-ink-2">
                {galat}
              </p>
            )}
          </div>

          <p className="mt-3 text-center text-xs text-muted">
            {bisaPesan ? "Keduanya membuat nomor pesanan yang sama" : `Lengkapi dulu: ${belumLengkap.join(", ")}`}
          </p>

          <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">
            {!bayarAktif
              ? "Pembayaran online belum aktif. Pesanan diselesaikan lewat WhatsApp — rinciannya sudah tersusun rapi."
              : tombolWa
                ? "Bayar sekarang membuka halaman pembayaran Midtrans. Lewat WhatsApp, pesanan tetap tercatat dan pembayarannya diatur bersama admin."
                : "Pembayaran diproses lewat Midtrans: QRIS, transfer virtual account, atau kartu. Ada pertanyaan sebelum bayar? Pakai tombol WhatsApp di pojok layar."}
          </p>
        </div>
      </aside>
    </div>
  );
}
