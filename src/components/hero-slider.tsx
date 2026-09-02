"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Slide } from "@/lib/promo";

/**
 * Deretan banner 16:9 di paling atas beranda.
 *
 * Digeser memakai scroll mendatar dengan scroll-snap, BUKAN transform dan
 * penangan sentuh sendiri. Alasannya: geser jari, roda mouse mendatar, dan
 * papan ketik langsung bekerja dari peramban, dan momentum di iOS terasa
 * benar tanpa satu baris pun kode gerak.
 *
 * Gambarnya memakai <img> biasa, bukan next/image. next/image menolak alamat
 * luar yang tidak terdaftar di images.remotePatterns, sedangkan panel admin
 * harus bisa menerima alamat gambar mana pun — pemiliknya tidak punya jalur
 * unggah berkas ke server ini.
 */
export function HeroSlider({ slides }: { slides: Slide[] }) {
  const rel = useRef<HTMLDivElement>(null);
  const [aktif, setAktif] = useState(0);

  // Indeks aktif dibaca DARI posisi gulir, bukan sebaliknya. Dengan begitu
  // titik penanda tetap benar walau digeser jari, roda, atau papan ketik.
  useEffect(() => {
    const el = rel.current;
    if (!el || slides.length < 2) return;

    // Dibaca langsung di penangan, bukan lewat requestAnimationFrame:
    // rAF berhenti selama tab tidak terlihat, sehingga penandanya bisa
    // tertinggal di slide yang salah saat pengunjung kembali. Peristiwa
    // scroll sendiri sudah dibatasi peramban sekitar sekali per rangka.
    const onScroll = () => {
      const lebar = el.clientWidth;
      if (lebar > 0) setAktif(Math.round(el.scrollLeft / lebar));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Dijalankan sekali di awal: posisi gulir bisa saja sudah tidak nol,
    // misalnya setelah peramban memulihkan posisi halaman.
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const ke = (i: number) => {
    const el = rel.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <section aria-label="Pengumuman" className="mx-auto max-w-6xl px-4 pt-4">
      <div className="relative">
        <div
          ref={rel}
          className="rail flex snap-x snap-mandatory overflow-x-auto rounded-2xl border border-line bg-sunken"
        >
          {slides.map((s, i) => {
            const isi = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.gambar}
                  alt={s.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {(s.judul || s.teks || s.tombol) && (
                  <>
                    {/* Lapisan gelap hanya di sisi teks, supaya fotonya tetap
                        terlihat tapi tulisannya tetap terbaca. */}
                    <div className="absolute inset-0 bg-gradient-to-r from-ink/75 via-ink/40 to-transparent" />
                    <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-5 sm:gap-2.5 sm:p-10">
                      {s.judul && (
                        <h2 className="font-display max-w-md text-lg leading-tight font-extrabold text-bg text-balance sm:text-3xl">
                          {s.judul}
                        </h2>
                      )}
                      {s.teks && (
                        <p className="max-w-sm text-xs leading-snug text-bg/85 sm:text-sm">{s.teks}</p>
                      )}
                      {s.tombol && (
                        <span className="mt-1 w-fit rounded-xl bg-jingga px-4 py-2 text-xs font-semibold text-jingga-ink sm:mt-2 sm:px-5 sm:py-2.5 sm:text-sm">
                          {s.tombol}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            );

            const kelas = "relative aspect-video w-full shrink-0 snap-center overflow-hidden";

            if (!s.tautan) {
              return (
                <div key={i} className={kelas}>
                  {isi}
                </div>
              );
            }
            return s.tautan.startsWith("/") ? (
              <Link key={i} href={s.tautan} className={kelas}>
                {isi}
              </Link>
            ) : (
              <a
                key={i}
                href={s.tautan}
                target="_blank"
                rel="noopener noreferrer"
                className={kelas}
              >
                {isi}
              </a>
            );
          })}
        </div>

        {slides.length > 1 && (
          <>
            {/* Titik penanda. Diletakkan di luar area gulir supaya tidak ikut
                bergeser bersama slide-nya. */}
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => ke(i)}
                  aria-label={`Slide ${i + 1} dari ${slides.length}`}
                  aria-current={i === aktif}
                  className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                    i === aktif ? "w-6 bg-bg" : "w-1.5 bg-bg/55 hover:bg-bg/80"
                  }`}
                />
              ))}
            </div>

            {/* Panah hanya di layar lebar: di ponsel geser jari sudah cukup,
                dan panah malah menutupi gambarnya. */}
            <button
              type="button"
              onClick={() => ke(Math.max(0, aktif - 1))}
              disabled={aktif === 0}
              aria-label="Slide sebelumnya"
              className="absolute top-1/2 left-3 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-bg/85 text-ink shadow-card transition hover:bg-bg disabled:opacity-0 md:grid"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => ke(Math.min(slides.length - 1, aktif + 1))}
              disabled={aktif === slides.length - 1}
              aria-label="Slide berikutnya"
              className="absolute top-1/2 right-3 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-bg/85 text-ink shadow-card transition hover:bg-bg disabled:opacity-0 md:grid"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}
