/**
 * Lapisan ongkir.
 *
 * Bentuk data dan nama field di bawah sengaja dicocokkan dengan RajaOngkir V2
 * (Komerce) supaya penggantian nanti tidak menyentuh komponen UI:
 *
 *   GET  https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=
 *   POST https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost
 *        origin, destination, weight (gram), courier, price
 *   header: key: <API_KEY>
 *
 * API key belum ada, jadi kedua fungsi di bawah masih memakai data contoh.
 * Begitu key tersedia, hanya isi kedua fungsi ini yang diganti dengan
 * pemanggilan sungguhan dari sisi server.
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

/** Titik asal pengiriman: outlet Tanjung Barat. ID sebenarnya menyusul dari API. */
export const ORIGIN_LABEL = "Tanjung Barat, Jagakarsa, Jakarta Selatan";

/** Penanda bahwa angka yang tampil belum berasal dari RajaOngkir. */
export const ONGKIR_MASIH_CONTOH = true;

/** Beberapa tujuan contoh, bentuknya persis seperti jawaban RajaOngkir. */
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
    id: 15421,
    label: "KEMANGGISAN, PALMERAH, JAKARTA BARAT, DKI JAKARTA, 11480",
    subdistrict_name: "KEMANGGISAN",
    district_name: "PALMERAH",
    city_name: "JAKARTA BARAT",
    province_name: "DKI JAKARTA",
    zip_code: "11480",
  },
  {
    id: 22881,
    label: "KEMANG, BOGOR, JAWA BARAT, 16310",
    subdistrict_name: "KEMANG",
    district_name: "KEMANG",
    city_name: "BOGOR",
    province_name: "JAWA BARAT",
    zip_code: "16310",
  },
  {
    id: 31555,
    label: "SINDUHARJO, NGAGLIK, SLEMAN, DI YOGYAKARTA, 55581",
    subdistrict_name: "SINDUHARJO",
    district_name: "NGAGLIK",
    city_name: "SLEMAN",
    province_name: "DI YOGYAKARTA",
    zip_code: "55581",
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

export async function cariTujuan(q: string): Promise<Destination[]> {
  const term = q.trim().toLowerCase();
  if (term.length < 3) return [];
  return CONTOH_TUJUAN.filter((d) => d.label.toLowerCase().includes(term)).slice(0, 8);
}

/**
 * Tarif contoh. Rumusnya kasar dan hanya untuk menguji tampilan:
 * tarif dasar per kurir + kelipatan berat per kilogram (dibulatkan ke atas,
 * sebagaimana kurir menghitung), lalu dinaikkan untuk tujuan luar Jakarta.
 */
export async function hitungOngkir(tujuan: Destination, beratGram: number): Promise<ShippingRate[]> {
  const kg = Math.max(1, Math.ceil(beratGram / 1000));
  const luarJakarta = !tujuan.province_name.includes("DKI JAKARTA");
  const f = luarJakarta ? 2.4 : 1;

  return [
    {
      code: "jne",
      name: "JNE",
      service: "REG",
      description: "Layanan reguler",
      cost: Math.round(10_000 * f) * kg,
      etd: luarJakarta ? "2-3 hari" : "1-2 hari",
    },
    {
      code: "jnt",
      name: "J&T",
      service: "EZ",
      description: "Layanan ekonomis",
      cost: Math.round(9_000 * f) * kg,
      etd: luarJakarta ? "3-4 hari" : "2 hari",
    },
    {
      code: "sicepat",
      name: "SiCepat",
      service: "BEST",
      description: "Besok sampai tujuan",
      cost: Math.round(24_000 * f) * kg,
      etd: luarJakarta ? "2 hari" : "1 hari",
    },
  ];
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
