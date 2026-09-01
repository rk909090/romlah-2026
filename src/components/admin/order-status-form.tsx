"use client";

import { useActionState } from "react";
import { ubahPesanan, type FormState } from "@/app/admin/actions";
import { LABEL_STATUS, SEMUA_STATUS } from "@/lib/order-status";

const AWAL: FormState = {};

const kelasInput =
  "w-full rounded-xl border border-line bg-bg px-4 py-3 text-sm outline-none transition focus:border-jingga";
const kelasLabel = "block text-xs font-semibold tracking-wide text-muted uppercase";

export function OrderStatusForm({
  id,
  status,
  tracking,
}: {
  id: number;
  status: string;
  tracking: string | null;
}) {
  const [state, action, pending] = useActionState(ubahPesanan, AWAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />

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
        <span className={kelasLabel}>Status</span>
        <select name="status" defaultValue={status} className={kelasInput}>
          {SEMUA_STATUS.map((s) => (
            <option key={s} value={s}>
              {LABEL_STATUS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={kelasLabel}>Nomor resi</span>
        <input name="tracking" defaultValue={tracking ?? ""} className={kelasInput} placeholder="Opsional" />
        <span className="text-xs text-muted">Tampil di halaman status yang dibuka pembeli.</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-jingga px-5 py-3.5 text-sm font-semibold text-jingga-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
