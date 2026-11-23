import { Suspense } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { AmoraIcon } from "@/components/brand/logo";
import { requireAdmin } from "@/lib/auth/dal";

/** Provisória (Fase 3). O dashboard real vem na Fase 7. */
export default function AdminHome() {
  return (
    <Suspense fallback={<div className="m-6 h-40 animate-pulse rounded-[var(--radius-card)] bg-amora-100" aria-hidden="true" />}>
      <AdminHomeContent />
    </Suspense>
  );
}

async function AdminHomeContent() {
  const admin = await requireAdmin();
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-10">
      <header className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amora-800">
          <AmoraIcon className="h-6 w-6 text-berry" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amora-600">Painel administrativo</p>
          <h1 className="font-display text-2xl font-bold text-amora-900">Olá, {admin.full_name || admin.email}</h1>
        </div>
      </header>
      <div className="rounded-[var(--radius-card)] border border-amora-100 bg-white p-5 text-sm text-amora-900/80 shadow-sm">
        Acesso administrativo confirmado no servidor. Pedidos, produtos, estoque e configurações chegam nas próximas fases.
      </div>
      <form action={signOutAction}>
        <button className="min-h-11 rounded-full border border-amora-800/30 px-5 text-sm font-semibold text-amora-800 transition-colors hover:bg-amora-800 hover:text-creme-100">
          Sair
        </button>
      </form>
    </section>
  );
}
