"use client";

import { useActionState } from "react";
import { ubahLead, type FormState } from "@/app/admin/actions";
import { LABEL_STATUS_LEAD, STATUS_LEAD, type Lead } from "@/lib/lead-status";

const AWAL: FormState = {};

/**
 * Ubah status dan catatan satu prospek.
 *
 * Satu formulir per baris, bukan satu formulir besar untuk seluruh tabel:
 * tim pemasaran menindaklanjuti prospek satu per satu, dan menyimpan seluruh
 * baris sekaligus akan menimpa perubahan orang lain yang sedang membuka
 * halaman yang sama.
 */
export function LeadForm({ lead }: { lead: Lead }) {
  const [state, action, pending] = useActionState(ubahLead, AWAL);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={lead.id} />

      <select
        name="status"
        defaultValue={lead.status}
        className="rounded-lg border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-jingga"
      >
        {STATUS_LEAD.map((s) => (
          <option key={s} value={s}>
            {LABEL_STATUS_LEAD[s]}
          </option>
        ))}
      </select>

      <input
        name="note"
        defaultValue={lead.adminNote ?? ""}
        placeholder="Catatan…"
        className="min-w-40 flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-xs outline-none focus:border-jingga"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-line-2 bg-surface px-3 py-2 text-xs font-semibold transition hover:bg-sunken disabled:opacity-60"
      >
        {pending ? "…" : "Simpan"}
      </button>

      {state.error && <span className="text-xs text-jingga">{state.error}</span>}
      {state.ok && <span className="text-xs text-pandan">{state.ok}</span>}
    </form>
  );
}
