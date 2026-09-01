import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const EKSTENSI = [".ts", ".tsx", ".mjs", ".js"];

/** Lengkapi ekstensi bila belum ada, termasuk bentuk direktori/index. */
function lengkapi(absolut) {
  if (fs.existsSync(absolut) && fs.statSync(absolut).isFile()) return absolut;
  for (const e of EKSTENSI) {
    if (fs.existsSync(absolut + e)) return absolut + e;
  }
  for (const e of EKSTENSI) {
    const idx = path.join(absolut, "index" + e);
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // Alias tsconfig: "@/x" -> <root>/src/x
  if (specifier.startsWith("@/")) {
    const berkas = lengkapi(path.join(SRC, specifier.slice(2)));
    if (berkas) return { url: pathToFileURL(berkas).href, shortCircuit: true };
  }

  // Jalur relatif tanpa ekstensi, dari berkas .ts/.tsx
  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const dasar = path.dirname(fileURLToPath(context.parentURL));
    const berkas = lengkapi(path.resolve(dasar, specifier));
    if (berkas) return { url: pathToFileURL(berkas).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}
