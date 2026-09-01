"use client";

import { useActionState } from "react";
import { gantiSandi, type FormState } from "@/app/admin/actions";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

export function PasswordForm() {
  const [state, action, pending] = useActionState(gantiSandi, AWAL);

  return (
    <form action={action} className="flex max-w-sm flex-col gap-4">
      {state.error && (
        <p role="alert" className="rounded-xl border border-jingga/40 bg-jingga-soft px-4 py-3 text-sm text-ink-2">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="rounded-xl border border-pandan/40 bg-pandan-soft px-4 py-3 text-sm text-ink-2">
          {state.ok}
        </p>
      )}

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Kata sandi saat ini</span>
        <input name="current" type="password" autoComplete="current-password" required className={kelasInput} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Kata sandi baru</span>
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
        <span className={kelasLabel}>Ulangi kata sandi baru</span>
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
        className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Ganti kata sandi"}
      </button>
    </form>
  );
}
