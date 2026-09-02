import Script from "next/script";
import { Suspense } from "react";
import { ANALYTICS, analitikAktif } from "@/data/site";
import { LacakPindahHalaman } from "./analytics-route";

/**
 * Tag pelacakan toko.
 *
 * Sengaja dipasang di layout grup (toko), BUKAN di layout akar: halaman
 * /admin tidak perlu — dan tidak boleh — ikut terlacak. Judul halaman admin
 * memuat nama pelanggan dan nomor pesanan, dan itu tidak pantas dikirim ke
 * Google atau Meta.
 *
 * Daftar ID beserta asal-usulnya ada di komentar ANALYTICS pada data/site.ts.
 */
export function Analytics() {
  if (!analitikAktif) return null;

  return (
    <>
      {/* ── Google Tag Manager ──────────────────────────────────────────
          Dipasang lebih dulu supaya tag di dalam wadahnya sempat menangkap
          kunjungan pertama. Apa saja isi wadah ini diatur di panel GTM,
          bukan di sini. */}
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${ANALYTICS.gtm}');`}
      </Script>

      {/* ── Google tag (gtag.js) ──────────────────────────────────────── */}
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS.googleTag}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${ANALYTICS.googleTag}');`}
      </Script>

      {/* ── Meta Pixel ─────────────────────────────────────────────────── */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${ANALYTICS.metaPixel}');
fbq('track', 'PageView');`}
      </Script>

      {/* Kunjungan berikutnya di dalam satu sesi. Dibungkus Suspense karena
          pelacaknya membaca useSearchParams, dan tanpa batas ini seluruh
          halaman di bawah layout ikut keluar dari render statis. */}
      <Suspense fallback={null}>
        <LacakPindahHalaman />
      </Suspense>

      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${ANALYTICS.gtm}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}
