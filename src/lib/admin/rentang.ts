/**
 * Penyaring rentang tanggal untuk panel admin.
 *
 * KENAPA SERIBET INI: server basis data Hostinger berjalan di UTC — diperiksa
 * langsung, `NOW()` sama persis dengan `UTC_TIMESTAMP()` — sedangkan tokonya
 * di Jakarta (WIB, UTC+7). Kalau batas harinya dihitung apa adanya, pesanan
 * jam 6 pagi WIB tersimpan sebagai jam 23.00 UTC HARI SEBELUMNYA, dan filter
 * "hari ini" akan melewatkannya.
 *
 * Jadi seluruh batas dihitung sebagai titik waktu WIB, lalu diubah ke UTC
 * untuk dibandingkan dengan kolom DATETIME. Batas atas selalu EKSKLUSIF
 * (`< batas`) supaya detik terakhir hari itu tidak ikut hilang.
 */

const ZONA = "Asia/Jakarta";

export const RENTANG = {
  "hari-ini": "Hari ini",
  kemarin: "Kemarin",
  "7hari": "7 hari terakhir",
  "30hari": "30 hari terakhir",
  "bulan-ini": "Bulan ini",
  "bulan-lalu": "Bulan lalu",
} as const;

export type KunciRentang = keyof typeof RENTANG;

export const adalahRentang = (v: unknown): v is KunciRentang =>
  typeof v === "string" && v in RENTANG;

/** Tanggal hari ini di Jakarta sebagai "YYYY-MM-DD", apa pun zona servernya. */
export function hariIniWIB(now: Date = new Date()): string {
  // en-CA memberi bentuk ISO (YYYY-MM-DD); ini cara yang tidak bergantung
  // pada zona waktu proses Node, yang di Hostinger belum tentu WIB.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Geser sebuah tanggal "YYYY-MM-DD" sekian hari, tetap dalam bentuk yang sama. */
export function geserHari(tgl: string, hari: number): string {
  const d = new Date(`${tgl}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + hari);
  return d.toISOString().slice(0, 10);
}

/** Tanggal pertama di bulan yang sama. */
const awalBulan = (tgl: string) => `${tgl.slice(0, 7)}-01`;

/** Ubah tengah malam WIB pada tanggal itu menjadi "YYYY-MM-DD HH:MM:SS" UTC. */
function tengahMalamWIBkeUTC(tgl: string): string {
  const d = new Date(`${tgl}T00:00:00+07:00`);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export type Rentang = {
  /** Nilai yang dipilih pengguna, untuk mengisi ulang formulir dan chip. */
  rentang?: KunciRentang;
  dari?: string;
  sampai?: string;
  /** Batas bawah UTC, inklusif. undefined = tanpa batas bawah. */
  mulaiUtc?: string;
  /** Batas atas UTC, EKSKLUSIF. undefined = tanpa batas atas. */
  sebelumUtc?: string;
  /** true bila ada penyaringan tanggal apa pun yang aktif. */
  aktif: boolean;
  /** Kalimat siap tampil, misalnya "1–7 September 2026". */
  label: string;
};

const YYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Tanggal yang benar-benar ada, bukan sekadar berbentuk YYYY-MM-DD.
 *
 * Memeriksa bentuknya saja tidak cukup: "2026-13-45" lolos regex, lalu
 * `new Date` menghasilkan Invalid Date dan `toISOString` MELEMPAR — satu
 * parameter URL asal ketik cukup untuk menjatuhkan halaman admin.
 *
 * Pemeriksaan pulang-pergi sekaligus menolak tanggal yang digulung JavaScript,
 * seperti "2026-02-31" yang diam-diam jadi 3 Maret.
 */
function tanggalSah(s: string): boolean {
  if (!YYYYMMDD.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Terjemahkan parameter URL jadi batas waktu.
 *
 * `rentang` (chip cepat) menang atas `dari`/`sampai` bila keduanya terkirim —
 * chip adalah yang barusan ditekan pengguna.
 */
export function bacaRentang(
  sp: { rentang?: string; dari?: string; sampai?: string },
  now: Date = new Date(),
): Rentang {
  const hariIni = hariIniWIB(now);

  let dari: string | undefined;
  let sampai: string | undefined;
  let kunci: KunciRentang | undefined;

  if (adalahRentang(sp.rentang)) {
    kunci = sp.rentang;
    switch (kunci) {
      case "hari-ini":
        dari = sampai = hariIni;
        break;
      case "kemarin":
        dari = sampai = geserHari(hariIni, -1);
        break;
      case "7hari":
        dari = geserHari(hariIni, -6);
        sampai = hariIni;
        break;
      case "30hari":
        dari = geserHari(hariIni, -29);
        sampai = hariIni;
        break;
      case "bulan-ini":
        dari = awalBulan(hariIni);
        sampai = hariIni;
        break;
      case "bulan-lalu": {
        const akhirLalu = geserHari(awalBulan(hariIni), -1);
        dari = awalBulan(akhirLalu);
        sampai = akhirLalu;
        break;
      }
    }
  } else {
    if (sp.dari && tanggalSah(sp.dari)) dari = sp.dari;
    if (sp.sampai && tanggalSah(sp.sampai)) sampai = sp.sampai;
    // Tanggal terbalik ditukar, bukan ditolak: hasil kosong tanpa penjelasan
    // lebih membingungkan daripada diam-diam dibetulkan.
    if (dari && sampai && dari > sampai) [dari, sampai] = [sampai, dari];
  }

  const aktif = Boolean(dari || sampai);

  return {
    rentang: kunci,
    dari,
    sampai,
    mulaiUtc: dari ? tengahMalamWIBkeUTC(dari) : undefined,
    // Batas atas eksklusif: tengah malam WIB HARI BERIKUTNYA.
    sebelumUtc: sampai ? tengahMalamWIBkeUTC(geserHari(sampai, 1)) : undefined,
    aktif,
    label: !aktif
      ? "Semua waktu"
      : kunci
        ? RENTANG[kunci]
        : dari && sampai
          ? dari === sampai
            ? tanggalPanjang(dari)
            : `${tanggalPanjang(dari)} – ${tanggalPanjang(sampai)}`
          : dari
            ? `Sejak ${tanggalPanjang(dari)}`
            : `Sampai ${tanggalPanjang(sampai!)}`,
  };
}

export function tanggalPanjang(tgl: string): string {
  return new Date(`${tgl}T00:00:00Z`).toLocaleDateString("id-ID", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Potongan SQL `AND …` beserta nilainya, siap ditempel ke kueri.
 *
 * Nama kolomnya ikut jadi parameter karena tabel pesanan dan tabel prospek
 * memakai kolom yang berbeda — tapi nilainya TIDAK pernah datang dari URL,
 * hanya dari pemanggil di kode.
 */
export function syaratRentang(
  r: Rentang,
  kolom: string,
): { sql: string; nilai: string[] } {
  const sql: string[] = [];
  const nilai: string[] = [];
  if (r.mulaiUtc) {
    sql.push(`${kolom} >= ?`);
    nilai.push(r.mulaiUtc);
  }
  if (r.sebelumUtc) {
    sql.push(`${kolom} < ?`);
    nilai.push(r.sebelumUtc);
  }
  return { sql: sql.join(" AND "), nilai };
}
