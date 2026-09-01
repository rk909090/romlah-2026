import { AdminHeading } from "@/components/admin/admin-shell";
import { PasswordForm } from "@/components/admin/password-form";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export const metadata = { title: "Pengaturan" };

export default async function Pengaturan() {
  // Layout (panel) sudah memastikan ada sesi; ini hanya untuk mengambil datanya.
  const user = await getCurrentUser();

  const sesi = await query<{ created_at: string; expires_at: string; user_agent: string | null }>(
    `SELECT created_at, expires_at, user_agent FROM admin_sessions
      WHERE user_id = ? AND expires_at > NOW() ORDER BY created_at DESC`,
    [user?.id ?? 0],
  );

  return (
    <>
      <AdminHeading title="Pengaturan" description="Akun dan keamanan." />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 font-bold">Akun</h2>
          <p className="mb-4 text-sm text-ink-2">
            {user?.name} · {user?.email}
          </p>
          <h3 className="font-display mb-3 border-t border-line pt-4 text-sm font-bold">Ganti kata sandi</h3>
          <PasswordForm />
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
          <h2 className="font-display mb-1 font-bold">Sesi aktif</h2>
          <p className="mb-4 text-sm text-ink-2">
            {sesi.length} sesi masih berlaku. Mengganti kata sandi memutus semuanya kecuali yang sedang dipakai.
          </p>
          <ul className="divide-y divide-line text-sm">
            {sesi.map((s, i) => (
              <li key={i} className="py-3">
                <p className="truncate text-ink-2">{s.user_agent ?? "Perangkat tidak dikenali"}</p>
                <p className="text-xs text-muted">
                  Mulai {new Date(s.created_at).toLocaleString("id-ID")} · berakhir{" "}
                  {new Date(s.expires_at).toLocaleDateString("id-ID")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
