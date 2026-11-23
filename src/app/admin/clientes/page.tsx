import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, adminButton } from "@/components/admin/ui";
import { CUSTOMERS_PAGE_SIZE, listCustomers } from "@/lib/admin/customers";
import { formatBRL } from "@/lib/domain/money";
import { formatBrazilianPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Clientes" };

const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const SORTS = [
  { id: "recentes", label: "Cadastro mais recente" },
  { id: "gasto", label: "Maior valor gasto" },
  { id: "pedidos", label: "Mais pedidos" },
];

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function CustomersPage(props: PageProps<"/admin/clientes">) {
  return (
    <>
      <PageHeader title="Clientes" description="Quem compra na loja, quanto já gastou e como falar com cada pessoa." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <List {...props} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: PageProps<"/admin/clientes">) {
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const sort = SORTS.some((s) => s.id === one(sp.ordem)) ? one(sp.ordem)! : "recentes";
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const { rows, total } = await listCustomers({ q, sort, page });
  const pages = Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE));
  const qs = (p: number) => `/admin/clientes?${new URLSearchParams({ ...(q && { q }), ordem: sort, pagina: String(p) })}`;

  return (
    <>
      <form method="get" className="mb-4 grid gap-2 rounded-2xl border border-amora-900/10 bg-white p-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="sr-only" htmlFor="q">
          Buscar cliente
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Nome, e-mail ou telefone" className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm focus:border-amora-700 focus:outline-none focus:ring-2 focus:ring-amora-700/15" />
        <select name="ordem" defaultValue={sort} aria-label="Ordenar" className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button className={adminButton("primary")}>Buscar</button>
      </form>

      {rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-amora-900/60">{q ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}</Card>
      ) : (
        <ul className="grid gap-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/clientes/${c.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-amora-900/10 bg-white p-3 hover:border-amora-800/30 hover:bg-amora-100/15 md:grid-cols-[auto_1fr_8rem_8rem_8rem]">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-amora-100/60 text-sm font-bold text-amora-800" aria-hidden="true">
                  {(c.full_name || c.email || "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-semibold text-amora-950">
                    <span className="truncate">{c.full_name || "Sem nome"}</span>
                    {c.role === "admin" && <span className="rounded-full bg-amora-800 px-2 py-0.5 text-[10px] font-semibold text-creme-50">ADMIN</span>}
                  </span>
                  <span className="block truncate text-xs text-amora-900/55">
                    {c.email}
                    {c.phone ? ` · ${formatBrazilianPhone(c.phone)}` : ""}
                  </span>
                </span>
                <span className="text-right text-sm">
                  <span className="block font-semibold tabular-nums text-amora-950">{formatBRL(c.total_spent_cents)}</span>
                  <span className="text-xs text-amora-900/55 md:hidden">{c.orders_count} pedido(s)</span>
                </span>
                <span className="hidden text-right text-sm tabular-nums text-amora-900/70 md:block">{c.orders_count} pedido(s)</span>
                <span className="hidden text-right text-xs text-amora-900/55 md:block">
                  desde {date.format(new Date(c.created_at))}
                  {c.last_order_at && <span className="block">último: {date.format(new Date(c.last_order_at))}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-amora-900/60">
            Página {page} de {pages} · {total} cliente(s)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={qs(page - 1)} className={adminButton("secondary")}>
                ← Anterior
              </Link>
            )}
            {page < pages && (
              <Link href={qs(page + 1)} className={adminButton("secondary")}>
                Próxima →
              </Link>
            )}
          </div>
        </nav>
      )}
      <p className="mt-4 text-xs text-amora-900/45">“Gasto” considera apenas pedidos com pagamento confirmado.</p>
    </>
  );
}
