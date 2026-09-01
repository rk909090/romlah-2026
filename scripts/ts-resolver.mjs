/**
 * Resolver modul untuk skrip uji.
 *
 * Node ESM menuntut ekstensi eksplisit dan tidak mengenal alias `@/` milik
 * tsconfig, sedangkan kode aplikasi memakai keduanya. Daripada mengubah gaya
 * impor kode produksi hanya demi pengujian, hook kecil ini yang menyesuaikan.
 *
 * Dipasang lewat: node --import ./scripts/ts-resolver.mjs skrip.mjs
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-resolver-hooks.mjs", pathToFileURL(import.meta.filename));
