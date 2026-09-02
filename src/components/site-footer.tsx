import Link from "next/link";
import { SITE } from "@/data/site";
import { WaButton } from "./wa-button";

export function SiteFooter({ paketAktif }: { paketAktif: boolean }) {
  return (
    <footer className="mt-20 border-t border-line bg-sunken">
      <div className="tumpal" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="font-display text-lg font-extrabold">{SITE.name}</h2>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-2">{SITE.description}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Belanja</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li><Link href="/katalog?kategori=makanan" className="hover:text-jingga">Makanan</Link></li>
            <li><Link href="/katalog?kategori=minuman" className="hover:text-jingga">Minuman</Link></li>
            {paketAktif && (
              <li><Link href="/katalog?kategori=paket" className="hover:text-jingga">Paket</Link></li>
            )}
            <li><Link href="/keranjang" className="hover:text-jingga">Keranjang</Link></li>
            <li><Link href="/akun" className="hover:text-jingga">Akun saya</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Toko</h3>
          <ul className="mt-3 space-y-3 text-sm text-ink-2">
            {SITE.outlets.map((o) => (
              <li key={o.name}>
                <span className="block font-medium text-ink">{o.name}</span>
                <span className={o.isOpen ? "" : "text-muted"}>{o.hours}</span>
              </li>
            ))}
            <li>
              <a
                href={SITE.marketplace.tokopedia}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-medium text-ink hover:text-jingga"
              >
                Tokopedia ↗
              </a>
              <span>Toko daring, buka 24 jam</span>
            </li>
            <li>
              <Link href="/toko" className="text-xs text-muted underline underline-offset-2 hover:text-ink-2">
                Lihat semua toko
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold tracking-widest text-muted uppercase">Hubungi</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-2">
            <li>
              <WaButton sumber="footer" lebar="inline" ukuran="kecil">
                {SITE.whatsapp.display}
              </WaButton>
            </li>
            <li><a href={`tel:${SITE.phone}`} className="hover:text-jingga">{SITE.phone}</a></li>
            <li><a href={`mailto:${SITE.email}`} className="hover:text-jingga">{SITE.email}</a></li>
            <li className="pt-2 text-xs text-muted">{SITE.outlets[0].address}</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto max-w-6xl border-t border-line px-4 py-6 text-xs text-muted">
        © {new Date().getFullYear()} {SITE.name} — {SITE.tagline}
      </div>
    </footer>
  );
}
