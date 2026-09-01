"use client";

import { useActionState } from "react";
import { buatAdminPertama, masuk, type FormState } from "@/app/admin/actions";

const AWAL: FormState = {};

function Galat({ pesan }: { pesan?: string }) {
  if (!pesan) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-jingga/40 bg-jingga-soft px-3.5 py-3 text-sm text-ink-2"
    >
      {pesan}
    </p>
  );
}

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";

const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

export function LoginForm() {
  const [state, action, pending] = useActionState(masuk, AWAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Galat pesan={state.error} />

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Email</span>
        <input name="email" type="email" autoComplete="username" required autoFocus className={kelasInput} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Kata sandi</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={kelasInput}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(buatAdminPertama, AWAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Galat pesan={state.error} />

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Nama</span>
        <input name="name" required autoFocus className={kelasInput} placeholder="Nama Anda" />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Email</span>
        <input name="email" type="email" autoComplete="username" required className={kelasInput} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Kata sandi</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={kelasInput}
        />
        <span className="text-xs text-muted">Minimal 12 karakter.</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Ulangi kata sandi</span>
        <input
          name="password2"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          className={kelasInput}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Membuat…" : "Buat akun admin"}
      </button>
    </form>
  );
}
