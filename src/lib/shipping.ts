/**
 * Lapisan ongkir — RajaOngkir V2 (Komerce).
 *
 *   GET  https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=
 *   POST https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost
 *        origin, destination, weight (gram), courier
 *   header: key: <API_KEY>
 *
 * Seluruh pemanggilan terjadi di server. API key tidak pernah menyentuh
 * peramban — komponen klien memanggil route handler di /api/ongkir/*.
 */

export type Destination = {
  id: number;
  label: string;
  subdistrict_name: string;
  district_name: string;
  city_name: string;
  province_name: string;
  zip_code: string;
};

export type ShippingRate = {
  code: string;
  name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

const BASE = "https://rajaongkir.komerce.id/api/v1";

/**
 * Kurir yang diminta. Yang benar-benar tersedia bergantung pada paket
 * langganan RajaOngkir; kurir di luar paket sekadar tidak muncul di hasil.
 */
const KURIR = process.env.RAJAONGKIR_COURIERS ?? "jne:sicepat:jnt:pos:tiki";

const kunci = () => process.env.RAJAONGKIR_API_KEY?.trim() || "";

/** Titik asal pengiriman: outlet Tanjung Barat. Lihat scripts/rajaongkir-origin.mjs. */
export const ORIGIN_ID = Number(process.env.RAJAONGKIR_ORIGIN_ID ?? 0);

export const ORIGIN_LABEL = "Tanjung Barat, Jagakarsa, Jakarta Selatan";

/**
 * Apakah lapisan ini masih memakai data contoh.
 *
 * Bernilai true hanya bila API key atau ID asal belum disetel. Kalau
 * keduanya ada, tarif SELALU dari RajaOngkir — kegagalan dilaporkan sebagai
 * galat, tidak pernah diam-diam diganti angka karangan. Ongkir palsu di
 * produksi berarti uang yang salah.
 */
export function pakaiContoh(): boolean {
  return !kunci() || !ORIGIN_ID;
}

export class ShippingError extends Error {}

async function panggil(path: string, init?: RequestInit): Promise<{ meta?: { message?: string }; data?: unknown }> {
  let r: Response;
  try {
    r = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { key: kunci(), ...(init?.headers ?? {}) },
      // Tarif berubah; jangan sampai tersimpan di cache fetch Next.
      cache: "no-store",
    });
  } catch (e) {
    throw new ShippingError(
      `Tidak bisa menghubungi layanan ongkir. ${e instanceof Error ? e.message : ""}`.trim(),
    );
  }

  const teks = await r.text();
  let j: { meta?: { message?: string }; data?: unknown };
  try {
    j = JSON.parse(teks) as typeof j;
  } catch {
    throw new ShippingError(`Jawaban layanan ongkir tidak terbaca (HTTP ${r.status}).`);
  }

  if (!r.ok) {
    throw new ShippingError(j.meta?.message ?? `Layanan ongkir menolak permintaan (HTTP ${r.status}).`);
  }
  return j;
}

/* ── Data contoh, hanya dipakai saat kredensial belum disetel ────────── */
const CONTOH_TUJUAN: Destination[] = [
  {
    id: 17471,
    label: "KEMANG, MAMPANG PRAPATAN, JAKARTA SELATAN, DKI JAKARTA, 12730",
    subdistrict_name: "KEMANG",
    district_name: "MAMPANG PRAPATAN",
    city_name: "JAKARTA SELATAN",
    province_name: "DKI JAKARTA",
    zip_code: "12730",
  },
  {
    id: 17392,
    label: "TANJUNG BARAT, JAGAKARSA, JAKARTA SELATAN, DKI JAKARTA, 12530",
    subdistrict_name: "TANJUNG BARAT",
    district_name: "JAGAKARSA",
    city_name: "JAKARTA SELATAN",
    province_name: "DKI JAKARTA",
    zip_code: "12530",
  },
  {
    id: 27103,
    label: "GUBENG, GUBENG, SURABAYA, JAWA TIMUR, 60281",
    subdistrict_name: "GUBENG",
    district_name: "GUBENG",
    city_name: "SURABAYA",
    province_name: "JAWA TIMUR",
    zip_code: "60281",
  },
  {
    id: 12009,
    label: "SUKAJADI, SUKAJADI, BANDUNG, JAWA BARAT, 40162",
    subdistrict_name: "SUKAJADI",
    district_name: "SUKAJADI",
    city_name: "BANDUNG",
    province_name: "JAWA BARAT",
    zip_code: "40162",
  },
];

/* ── Pencarian tujuan ────────────────────────────────────────────────── */
export async function cariTujuan(q: string): Promise<Destination[]> {
  const term = q.trim();
  if (term.length < 3) return [];

  if (pakaiContoh()) {
    return CONTOH_TUJUAN.filter((d) => d.label.toLowerCase().includes(term.toLowerCase())).slice(0, 8);
  }

  const j = await panggil(
    `/destination/domestic-destination?search=${encodeURIComponent(term)}&limit=10&offset=0`,
  );
  const data = Array.isArray(j.data) ? (j.data as Destination[]) : [];
  return data.map((d) => ({
    id: Number(d.id),
    label: d.label,
    subdistrict_name: d.subdistrict_name,
    district_name: d.district_name,
    city_name: d.city_name,
    province_name: d.province_name,
    zip_code: d.zip_code,
  }));
}

/* ── Hitung ongkir ───────────────────────────────────────────────────── */
type TarifMentah = {
  name?: string;
  code?: string;
  service?: string;
  description?: string;
  cost?: number | string;
  etd?: string;
};

export async function hitungOngkir(tujuan: Destination, beratGram: number): Promise<ShippingRate[]> {
  // Kurir menagih per kilogram yang dibulatkan ke atas; kirim minimal 1 kg
  // supaya tarif yang tampil sama dengan yang nanti ditagihkan.
  const berat = Math.max(1000, Math.ceil(beratGram));

  if (pakaiContoh()) {
    const kg = Math.ceil(berat / 1000);
    const luarJakarta = !tujuan.province_name.includes("DKI JAKARTA");
    const f = luarJakarta ? 2.4 : 1;
    return [
      { code: "jne", name: "JNE", service: "REG", description: "Layanan reguler", cost: Math.round(10_000 * f) * kg, etd: luarJakarta ? "2-3 hari" : "1-2 hari" },
      { code: "jnt", name: "J&T", service: "EZ", description: "Layanan ekonomis", cost: Math.round(9_000 * f) * kg, etd: luarJakarta ? "3-4 hari" : "2 hari" },
      { code: "sicepat", name: "SiCepat", service: "BEST", description: "Besok sampai tujuan", cost: Math.round(24_000 * f) * kg, etd: luarJakarta ? "2 hari" : "1 hari" },
    ];
  }

  const body = new URLSearchParams({
    origin: String(ORIGIN_ID),
    destination: String(tujuan.id),
    weight: String(berat),
    courier: KURIR,
  });

  const j = await panggil("/calculate/domestic-cost", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = Array.isArray(j.data) ? (j.data as TarifMentah[]) : [];
  return data
    .map((t) => ({
      code: String(t.code ?? "").toLowerCase(),
      name: String(t.name ?? t.code ?? "").trim(),
      service: String(t.service ?? "").trim(),
      description: String(t.description ?? "").trim(),
      cost: Number(t.cost ?? 0),
      etd: String(t.etd ?? "").trim() || "—",
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
