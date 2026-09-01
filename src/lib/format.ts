/** "Rp 45.000" — tanpa desimal, sesuai kebiasaan harga ritel Indonesia. */
export function rupiah(value: number): string {
  return "Rp " + value.toLocaleString("id-ID", { maximumFractionDigits: 0 });
}

/** Gram di bawah 1 kg tetap gram; di atas itu dibulatkan ke satu desimal. */
export function berat(gram: number): string {
  if (gram <= 0) return "—";
  if (gram < 1000) return `${gram} g`;
  const kg = gram / 1000;
  return `${kg.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg`;
}

/**
 * Nomor pesanan sementara, dibuat di sisi klien.
 *
 * CATATAN: begitu database aktif, penomoran harus pindah ke server agar
 * urut dan dijamin unik. Bentuknya sengaja dibuat sama supaya nomor yang
 * terlanjur beredar di WhatsApp tetap bisa dikenali.
 */
export function nomorPesananSementara(now: Date = new Date()): string {
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const acak = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `RML-${yy}${mm}${dd}-${acak}`;
}
