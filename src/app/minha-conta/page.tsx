import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { StatusBadge } from "@/components/conta/status-badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { requireProfile } from "@/lib/auth/dal";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber } from "@/lib/domain/order-status";
import { listOrdersForCurrentUser } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Minha conta" };

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" });

/** Versão inicial: lista de pedidos. Dashboard completo, dados e endereços vêm na Fase 8. */
export default function AccountPage(props: PageProps<"/minha-conta">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" aria-hidden="true" />}>
      <AccountContent {...props} />
    </Suspense>
  );
}

async function AccountContent({ searchParams }: PageProps<"/minha-conta">) {
  const profile = await requireProfile("/minha-conta");
  const [{ senha }, orders] = await Promise.all([searchParams, listOrdersForCurrentUser(20)]);
  const firstName = profile.full_name.split(" ")[0] || "por aqui";

  return (
    <section className="flex flex-col gap-6">
      {senha === "atualizada" && <Notice tone="success">Senha atualizada com sucesso.</Notice>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-creme-300">Minha conta</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-creme-50">Olá, {firstName} 💜</h1>
          <p className="mt-1 text-sm text-creme-100/70">{profile.email}</p>
        </div>
        {profile.role === "admin" && (
          <Link href="/admin" className={buttonClasses({ variant: "secondary" })}>
            Painel administrativo
          </Link>
        )}
      </header>

      <section aria-labelledby="pedidos">
        <h2 id="pedidos" className="mb-3 font-semibold text-creme-50">
          Meus pedidos
        </h2>
        {orders.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-10 text-center text-sm text-creme-100/75">
            Você ainda não fez pedidos.
            <Link href="/produtos" className={`${buttonClasses()} mt-4 flex w-fit mx-auto`}>
              Ver produtos
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/minha-conta/pedidos/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-4 transition-colors hover:border-creme-300/40"
                >
                  <span>
                    <span className="block font-semibold text-creme-50">{formatOrderNumber(o.order_number)}</span>
                    <span className="text-xs text-creme-100/65">
                      {date.format(new Date(o.created_at))} · {o.items_count} {o.items_count === 1 ? "peça" : "peças"} · {formatBRL(o.total_cents)}
                    </span>
                  </span>
                  <StatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={signOutAction}>
        <Button type="submit" variant="secondary">
          Sair
        </Button>
      </form>
    </section>
  );
}
