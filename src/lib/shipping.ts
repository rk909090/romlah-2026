/**
 * Lapisan ongkir — Biteship.
 *
 * Diverifikasi langsung terhadap API mereka:
 *   GET  https://api.biteship.com/v1/maps/areas?countries=ID&input=<q>&type=single
 *   POST https://api.biteship.com/v1/rates/couriers
 *   header: Authorization: <api key>   (mentah, tanpa "Bearer")
 *
 * Seluruh pemanggilan terjadi di server. API key tidak pernah menyentuh
 * peramban — komponen klien memanggil route handler di /api/ongkir/*.
 *
 * Berbeda dari RajaOngkir, ID area Biteship adalah STRING seperti
 * "IDNP6IDNC148IDND837IDZ12530", bukan angka. Kolom destination_id di basis
 * data ikut berubah jadi VARCHAR karenanya.
 */

export type Destination = {
  /** ID area Biteship, contoh: "IDNP6IDNC148IDND837IDZ12530". */
  id: string;
  /** Contoh: "Mampang Prapatan, Jakarta Selatan, DKI Jakarta. 12730" */
  label: string;
  district: string;
  city: string;
  province: string;
  postalCode: string;
};

export type ShippingRate = {
  code: string;
  name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

const BASE = "https://api.biteship.com";

/**
 * Kurir yang diminta. Yang benar-benar tersedia bergantung pada akun
 * Biteship; kurir di luar daftar akun sekadar tidak muncul di hasil.
 */
const KURIR = process.env.BITESHIP_COURIERS ?? "jne,sicepat,jnt,anteraja,pos,tiki,ninja";

const kunci = () => process.env.BITESHIP_API_KEY?.trim() || "";

/** Area asal pengiriman: outlet Tanjung Barat. Lihat scripts/biteship-origin.mjs. */
export const ORIGIN_AREA_ID = process.env.BITESHIP_ORIGIN_AREA_ID?.trim() || "";

export const ORIGIN_LABEL = "Tanjung Barat, Jagakarsa, Jakarta Selatan";

/**
 * Apakah lapisan ini masih memakai data contoh.
 *
 * Bernilai true hanya bila API key atau ID area asal belum disetel. Kalau
 * keduanya ada, tarif SELALU dari Biteship — kegagalan dilaporkan sebagai
 * galat, tidak pernah diam-diam diganti angka karangan. Ongkir palsu di
 * produksi berarti uang yang salah.
 */
export function pakaiContoh(): boolean {
  return !kunci() || !ORIGIN_AREA_ID;
}

export class ShippingError extends Error {}

async function panggil<T>(path: string, init?: RequestInit): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: kunci(), ...(init?.headers ?? {}) },
      // Tarif berubah; jangan sampai tersimpan di cache fetch Next.
      cache: "no-store",
    });
  } catch (e) {
    throw new ShippingError(
      `Tidak bisa menghubungi layanan ongkir. ${e instanceof Error ? e.message : ""}`.trim(),
    );
  }

  const teks = await r.text();
  let j: { success?: boolean; error?: string } & T;
  try {
    j = JSON.parse(teks) as typeof j;
  } catch {
    throw new ShippingError(`Jawaban layanan ongkir tidak terbaca (HTTP ${r.status}).`);
  }

  if (!r.ok || j.success === false) {
    throw new ShippingError(j.error ?? `Layanan ongkir menolak permintaan (HTTP ${r.status}).`);
  }
  return j;
}

/* ── Data contoh, hanya dipakai saat kredensial belum disetel ────────── */
const CONTOH_TUJUAN: Destination[] = [
  {
    id: "IDNP6IDNC148IDND840IDZ12730",
    label: "Mampang Prapatan, Jakarta Selatan, DKI Jakarta. 12730",
    district: "Mampang Prapatan",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12730",
  },
  {
    id: "IDNP6IDNC148IDND837IDZ12530",
    label: "Jagakarsa, Jakarta Selatan, DKI Jakarta. 12530",
    district: "Jagakarsa",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postalCode: "12530",
  },
  {
    id: "IDNP11IDNC434IDND5427IDZ60281",
    label: "Gubeng, Surabaya, Jawa Timur. 60281",
    district: "Gubeng",
    city: "Surabaya",
    province: "Jawa Timur",
    postalCode: "60281",
  },
];

/* ── Pencarian tujuan ────────────────────────────────────────────────── */
type AreaBiteship = {
  id: string;
  name: string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
  postal_code?: number | string;
};

export async function cariTujuan(q: string): Promise<Destination[]> {
  const term = q.trim();
  if (term.length < 3) return [];

  if (pakaiContoh()) {
    return CONTOH_TUJUAN.filter((d) => d.label.toLowerCase().includes(term.toLowerCase())).slice(0, 8);
  }

  const j = await panggil<{ areas?: AreaBiteship[] }>(
    `/v1/maps/areas?countries=ID&input=${encodeURIComponent(term)}&type=single`,
  );

  return (j.areas ?? []).slice(0, 10).map((a) => ({
    id: String(a.id),
    label: a.name,
    // Biteship hanya turun sampai kecamatan (level 3); tidak ada kelurahan.
    district: a.administrative_division_level_3_name ?? "",
    city: a.administrative_division_level_2_name ?? "",
    province: a.administrative_division_level_1_name ?? "",
    postalCode: String(a.postal_code ?? ""),
  }));
}

/* ── Hitung ongkir ───────────────────────────────────────────────────── */
type TarifBiteship = {
  courier_code?: string;
  courier_name?: string;
  courier_service_code?: string;
  courier_service_name?: string;
  description?: string;
  duration?: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  shipping_fee?: number;
  shipping_fee_discount?: number;
  shipping_fee_surcharge?: number;
  price?: number;
};

/**
 * Biaya yang ditagihkan ke pembeli.
 *
 * Dihitung sebagai ongkos kirim ditambah biaya tambahan, dikurangi potongan,
 * bukan dari field `price` mentah.
 *
 * Alasannya: pada contoh di dokumentasi Biteship, `price` (11000) sama dengan
 * `shipping_fee` (9000) ditambah `cash_on_delivery_fee` (2000), padahal toko
 * ini tidak melayani COD.
 *
 * Diperiksa terhadap tarif sungguhan (12 layanan, Jagakarsa ke Mampang
 * Prapatan): saat COD tidak diminta, `cash_on_delivery_fee` bernilai 0 dan
 * `price` sama persis dengan hasil hitungan ini pada SELURUH layanan. Jadi
 * keduanya setara hari ini — bentuk ini dipertahankan sebagai penjaga bila
 * kelak COD atau asuransi diaktifkan, agar biayanya tidak ikut tertagih
 * tanpa diminta.
 */
function biaya(t: TarifBiteship): number {
  const dasar = Number(t.shipping_fee ?? NaN);
  if (Number.isFinite(dasar)) {
    return Math.max(
      0,
      Math.round(dasar + Number(t.shipping_fee_surcharge ?? 0) - Number(t.shipping_fee_discount ?? 0)),
    );
  }
  return Math.round(Number(t.price ?? 0));
}

export async function hitungOngkir(tujuan: Destination, beratGram: number): Promise<ShippingRate[]> {
  // Kurir menagih per kilogram yang dibulatkan ke atas; kirim minimal 1 kg
  // supaya tarif yang tampil sama dengan yang nanti ditagihkan.
  const berat = Math.max(1000, Math.ceil(beratGram));

  if (pakaiContoh()) {
    const kg = Math.ceil(berat / 1000);
    const luarJakarta = !tujuan.province.toUpperCase().includes("DKI JAKARTA");
    const f = luarJakarta ? 2.4 : 1;
    return [
      { code: "jne", name: "JNE", service: "REG", description: "Layanan reguler", cost: Math.round(10_000 * f) * kg, etd: luarJakarta ? "2 - 3 days" : "1 - 2 days" },
      { code: "jnt", name: "J&T", service: "EZ", description: "Layanan ekonomis", cost: Math.round(9_000 * f) * kg, etd: luarJakarta ? "3 - 4 days" : "2 days" },
      { code: "sicepat", name: "SiCepat", service: "BEST", description: "Besok sampai tujuan", cost: Math.round(24_000 * f) * kg, etd: luarJakarta ? "2 days" : "1 day" },
    ];
  }

  const j = await panggil<{ pricing?: TarifBiteship[] }>("/v1/rates/couriers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origin_area_id: ORIGIN_AREA_ID,
      destination_area_id: tujuan.id,
      couriers: KURIR,
      // Biteship menghitung dari daftar barang, bukan satu angka berat.
      // Satu baris ringkas sudah cukup karena yang menentukan tarif hanya
      // berat totalnya.
      items: [{ name: "Oleh-oleh", value: 0, weight: berat, quantity: 1 }],
    }),
  });

  return (j.pricing ?? [])
    .map((t) => ({
      code: String(t.courier_code ?? "").toLowerCase(),
      name: String(t.courier_name ?? t.courier_code ?? "").trim(),
      service: String(t.courier_service_code ?? "").trim(),
      description: String(t.courier_service_name ?? t.description ?? "").trim(),
      cost: biaya(t),
      etd:
        String(t.duration ?? "").trim() ||
        [t.shipment_duration_range, t.shipment_duration_unit].filter(Boolean).join(" ") ||
        "—",
    }))
    .filter((t) => t.cost > 0 && t.service)
    .sort((a, b) => a.cost - b.cost);
}

/** Opsi ambil sendiri di outlet — tidak melibatkan kurir sama sekali. */
export const AMBIL_DI_TOKO: ShippingRate = {
  code: "pickup",
  name: "Ambil di toko",
  service: "Tanjung Barat",
  description: "Senin–Minggu, 09.00–17.00",
  cost: 0,
  etd: "Siap 2 jam",
};
