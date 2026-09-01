import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/auth-forms";
import { adaAdmin, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Masuk" };

export default async function Login() {
  if (await getCurrentUser()) redirect("/admin");
  // Tanpa satu pun admin, halaman ini mustahil dilewati — arahkan ke penyiapan.
  if (!(await adaAdmin())) redirect("/admin/setup");

  return (
    <div className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-float">
          <div className="tumpal" aria-hidden />
          <div className="p-7 sm:p-8">
            <div className="mb-7 flex items-center gap-3">
              <Image src="/merek/romlah-logo.png" alt="" width={116} height={110} className="h-11 w-auto" />
              <div>
                <h1 className="font-display text-xl leading-tight font-extrabold">Panel admin</h1>
                <p className="text-sm text-muted">Oleh-oleh khas Betawi</p>
              </div>
            </div>
            <LoginForm />
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-muted">
          Halaman ini hanya untuk pengelola toko Romlah.
        </p>
      </div>
    </div>
  );
}
