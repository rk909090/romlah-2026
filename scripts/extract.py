# -*- coding: utf-8 -*-
"""Tarik katalog romlah.com lama -> seed JSON + manifest unduhan untuk curl.

Dijalankan dua kali:
  fase 1 (manifest) -> tulis daftar unduhan, curl mengeksekusi
  fase 2 (verify)   -> catat hanya gambar yang berhasil tersimpan
Python di mesin ini gagal verifikasi TLS ke romlah.com, jadi unduhan diserahkan ke curl.
"""
import json, os, re, html, sys

SRC, OUT_DATA, OUT_IMG, MANIFEST = sys.argv[1:5]

# Berat tercatat dalam kg di WooCommerce. Satu baris jelas salah entri.
WEIGHT_OVERRIDE_G = {
    31526: 300,  # "Sagon Bakar Romlah" tercatat 300 kg -> hampir pasti 300 g
}

CATEGORY_MAP = {"Makanan": "makanan", "Minuman": "minuman", "Promo Bundling": "paket"}


def clean_html(raw: str) -> list[str]:
    if not raw:
        return []
    t = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    t = re.sub(r"</p\s*>", "\n\n", t, flags=re.I)
    t = re.sub(r"<li[^>]*>", "\n- ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace(" ", " ")
    lines = [re.sub(r"[ \t]+", " ", ln).strip() for ln in t.split("\n")]
    return [ln for ln in lines if ln]


def to_grams(raw, pid):
    if pid in WEIGHT_OVERRIDE_G:
        return WEIGHT_OVERRIDE_G[pid], True
    try:
        return round(float(raw) * 1000), False
    except (TypeError, ValueError):
        return 0, False


def main():
    products = json.load(open(SRC, encoding="utf-8"))
    os.makedirs(OUT_IMG, exist_ok=True)

    out, warnings, jobs, skipped_dupes = [], [], [], 0

    for p in products:
        pid, slug = p["id"], p["slug"]
        grams, overridden = to_grams(p.get("weight"), pid)
        if overridden:
            warnings.append(f"{pid} {p['name']}: berat {p.get('weight')} kg -> dipakai {grams} g")
        elif grams <= 0:
            warnings.append(f"{pid} {p['name']}: berat tidak terbaca ({p.get('weight')!r})")

        cats = [c["name"] for c in p.get("categories", [])]
        # "Promo Bundling" menang atas "Makanan" — produk itu memang paket.
        cat = "paket" if "Promo Bundling" in cats else CATEGORY_MAP.get(cats[0] if cats else "", "makanan")

        images, seen, idx = [], set(), 0
        for img in p.get("images", []):
            src = img.get("src")
            if not src or src in seen:      # situs lama mengulang foto yang sama di galeri
                if src:
                    skipped_dupes += 1
                continue
            seen.add(src)
            idx += 1                        # nomor urut foto, bukan jumlah yang sudah terunduh
            ext = os.path.splitext(src.split("?")[0])[1].lower()
            if ext not in (".jpg", ".jpeg", ".png", ".webp"):
                ext = ".jpg"
            fname = f"{slug}-{idx}{ext}"
            dest = os.path.join(OUT_IMG, fname)
            jobs.append((src, dest))
            if os.path.exists(dest) and os.path.getsize(dest) > 1024:
                images.append({"src": f"/produk/{fname}", "alt": p["name"]})

        mu = p["prices"]["currency_minor_unit"]
        out.append({
            "legacyId": pid,
            "slug": slug,
            "name": html.unescape(p["name"]),
            "price": int(int(p["prices"]["price"]) / (10 ** mu)),
            "weightGram": grams,
            "category": cat,
            "description": clean_html(p.get("short_description")),
            "images": images,
            "inStock": bool(p.get("is_in_stock")),
            "isVariable": p.get("type") == "variable",
        })

    out.sort(key=lambda x: (x["category"], x["name"]))
    json.dump(out, open(OUT_DATA, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    with open(MANIFEST, "w", encoding="utf-8") as f:
        for src, dest in jobs:
            # curl memperlakukan "\" di berkas config sebagai escape -> paksa forward slash
            f.write(f'url = "{src}"\noutput = "{dest.replace(os.sep, "/")}"\n')

    have = sum(len(p["images"]) for p in out)
    print(f"produk        : {len(out)}")
    print(f"foto unik     : {len(jobs)}  (duplikat dibuang: {skipped_dupes})")
    print(f"foto tersimpan: {have}")
    kosong = [p["slug"] for p in out if not p["images"]]
    print(f"tanpa foto    : {len(kosong)}" + (f" -> {kosong[:6]}{'...' if len(kosong) > 6 else ''}" if kosong else ""))
    print("per kategori  : " + ", ".join(
        f"{c}={sum(1 for p in out if p['category'] == c)}" for c in ("makanan", "minuman", "paket")))
    print(f"stok habis    : {sum(1 for p in out if not p['inStock'])}")
    if warnings:
        print("\nPERINGATAN DATA:")
        for w in warnings:
            print("  -", w)


if __name__ == "__main__":
    main()
