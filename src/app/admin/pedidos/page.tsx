import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, StatusPill, adminButton } from "@/components/admin/ui";
import { countOrdersByTab, listAdminOrders, ORDER_TABS, ORDERS_PAGE_SIZE, type OrderTab } from "@/lib/admin/queries";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber } from "@/lib/domain/order-status";
import { formatBrazilianPhone } from "@/lib/domain/phone";

export const metadata: Metadata = { title: "Pedidos" };

const dt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function AdminOrdersPage(props: PageProps<"/admin/pedidos">) {
  return (
    <>
      <PageHeader title="Pedidos" description="Pedidos chegam aqui automaticamente, em tempo real." />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <Orders {...props} />
      </Suspense>
    </>
  );
}

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Orders({ searchParams }: PageProps<"/admin/pedidos">) {
  const sp = await searchParams;
  const tab = (Object.keys(ORDER_TABS).includes(one(sp.aba) ?? "") ? one(sp.aba) : "novos") as OrderTab;
  const q = one(sp.q)?.slice(0, 60) ?? "";
  const from = one(sp.de) ?? "";
  const to = one(sp.ate) ?? "";
  const page = Math.max(1, Number(one(sp.pagina)) || 1);

  const [{ rows, total }, counts] = await Promise.all([listAdminOrders({ tab, q, from, to, page }), countOrdersByTab()]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const qs = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ aba: tab, ...(q && { q }), ...(from && { de: from }), ...(to && { ate: to }) });
    for (const [k, v] of Object.entries(over)) p.set(k, String(v));
    return `/admin/pedidos?${p}`;
  };
  const hasFilters = Boolean(q || from || to);

  return (
    <>
      {/* Abas */}
      <nav aria-label="Situação" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(Object.keys(ORDER_TABS) as OrderTab[]).map((t) => (
          <Link
            key={t}
            href={`/admin/pedidos?aba=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-colors ${
              t === tab ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900/80 hover:border-amora-800/40"
            }`}
          >
            {ORDER_TABS[t].label}
            <span
              className={`rounded-full px-1.5 text-xs tabular-nums ${
                t === tab ? "bg-creme-300 text-amora-900" : t === "novos" && counts.novos > 0 ? "bg-amber-200 font-bold text-amber-950" : "bg-amora-100/60 text-amora-900/70"
              }`}
            >
              {counts[t]}
            </span>
          </Link>
        ))}
      </nav>

      {/* Filtros */}
      <form method="get" action="/admin/pedidos" className="mb-4 grid gap-2 rounded-2xl border border-amora-900/10 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input type="hidden" name="aba" value={tab} />
        <label className="sr-only" htmlFor="q">
          Buscar pedido
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Nº do pedido, nome, e-mail ou telefone"
          className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm focus:border-amora-700 focus:outline-none focus:ring-2 focus:ring-amora-700/15"
        />
        <label className="flex items-center gap-2 text-xs text-amora-900/60">
          De
          <input type="date" name="de" defaultValue={from} className="min-h-10 rounded-xl border border-amora-900/15 px-2 text-sm text-amora-950" />
        </label>
        <label className="flex items-center gap-2 text-xs text-amora-900/60">
          Até
          <input type="date" name="ate" defaultValue={to} className="min-h-10 rounded-xl border border-amora-900/15 px-2 text-sm text-amora-950" />
        </label>
        <div className="flex gap-2">
          <button className={adminButton("primary", "flex-1")}>Filtrar</button>
          {hasFilters && (
            <Link href={`/admin/pedidos?aba=${tab}`} className={adminButton("ghost")}>
              Limpar
            </Link>
          )}
        </div>
      </form>

      {rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-amora-900/60">
          {hasFilters ? "Nenhum pedido com esses filtros." : tab === "novos" ? "Nenhum pedido novo no momento. Eles aparecem aqui sozinhos 💜" : "Nenhum pedido nesta situação."}
        </Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-amora-900/10 bg-amora-100/20 text-left text-xs text-amora-900/60">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 text-right font-medium">Peças</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amora-900/10">
                {rows.map((o) => (
                  <tr key={o.id} className={`group relative hover:bg-amora-100/25 ${o.status === "PENDING" ? "bg-amber-50/60" : ""}`}>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      <Link href={`/admin/pedidos/${o.id}`} className="after:absolute after:inset-0 group-hover:text-amora-700">
                        {formatOrderNumber(o.order_number)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-amora-950">{o.customer_name}</span>
                      <span className="text-xs text-amora-900/55">{o.customer_phone ? formatBrazilianPhone(o.customer_phone) : o.customer_email}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-amora-900/70">{dt.format(new Date(o.created_at))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{o.items_count}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatBRL(o.total_cents)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Celular: cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/pedidos/${o.id}`} className={`block rounded-2xl border border-amora-900/10 p-4 ${o.status === "PENDING" ? "bg-amber-50" : "bg-white"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">{formatOrderNumber(o.order_number)}</span>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="mt-2 font-medium text-amora-950">{o.customer_name}</p>
                  <div className="mt-1 flex justify-between text-sm text-amora-900/65">
                    <span>
                      {dt.format(new Date(o.created_at))} · {o.items_count} peça(s)
                    </span>
                    <span className="font-semibold text-amora-950">{formatBRL(o.total_cents)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {pages > 1 && (
            <nav aria-label="Paginação" className="mt-4 flex items-center justify-between text-sm">
              <span className="text-amora-900/60">
                Página {page} de {pages} · {total} pedido(s)
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={qs({ pagina: page - 1 })} className={adminButton("secondary")}>
                    ← Anterior
                  </Link>
                )}
                {page < pages && (
                  <Link href={qs({ pagina: page + 1 })} className={adminButton("secondary")}>
                    Próxima →
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
