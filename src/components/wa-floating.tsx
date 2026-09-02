import { IkonWa, WaButton } from "./wa-button";

/**
 * Tombol WhatsApp mengambang di pojok kanan bawah.
 *
 * Hanya di layar lebar (md ke atas): di ponsel tempat itu sudah ditempati
 * bilah tab, dan tombol mengambang akan menutupi tombol Keranjang. Versi
 * ponselnya berupa tab WhatsApp tersendiri di bilah bawah.
 *
 * Menekannya membuka formulir prospek yang sama dengan tombol WhatsApp lain,
 * jadi pertanyaan dari sini juga tercatat di /admin/inquiry.
 */
export function WaFloating() {
  return (
    <div className="fixed right-6 bottom-6 z-30 hidden md:block">
      <WaButton
        pesan="Halo Romlah, saya mau tanya-tanya soal oleh-oleh."
        sumber="lain"
        tampilan="polos"
        className="group flex items-center gap-0 rounded-full bg-wa py-4 pr-4 pl-4 font-semibold text-wa-ink shadow-float transition hover:gap-2 hover:bg-wa-2 hover:pr-5"
      >
        <IkonWa className="h-6 w-6 shrink-0" />
        {/* Labelnya melebar saat disorot: bulat dan ringkas saat diam,
            jelas maksudnya begitu didekati. */}
        <span className="max-w-0 overflow-hidden text-sm whitespace-nowrap transition-all duration-300 group-hover:max-w-[10rem]">
          Chat kami
        </span>
      </WaButton>
    </div>
  );
}
