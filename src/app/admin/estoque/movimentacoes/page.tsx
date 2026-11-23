import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, adminButton } from "@/components/admin/ui";
import { listMovements, type Movement } from "@/lib/admin/stock";

export const metadata: Metadata = { title: "Movimentações de estoque" };

const TYPE: Record<Movement["type"], { label: string; cls: string }> = {
  restock: { label: "Entrada", cls: "bg-emerald-100 text-emerald-900" },
  adjustment: { label: "Ajuste", cls: "bg-sky-100 text-sky-900" },
  reserve: { label: "Reserva (pedido)", cls: "bg-amber-100 text-amber-900" },
  release: { label: "Reserva liberada", cls: "bg-stone-200 text-stone-800" },
  sale: { label: "Venda (pago)", cls: "bg-violet-100 text-violet-900" },
  return: { label: "Devolução", cls: "bg-orange-100 text-orange-900" },
};

const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function MovementsPage(props: PageProps<"/admin/estoque/movimentacoes">) {
  return (
    <>
      <Link href="/admin/estoque" className="text-sm font-medium text-amora-700 hover:underline">
        ← Estoque
      </Link>
      <div className="mt-3">
        <PageHeader title="Histórico de movimentações" description="Toda alteração de estoque fica registrada: quem, quando, quanto e por quê." />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <List {...props} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: PageProps<"/admin/estoque/movimentacoes">) {
  const sp = await searchParams;
  const type = one(sp.tipo) ?? "";
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const { rows, total } = await listMovements({ type, page });
  const pages = Math.max(1, Math.ceil(total / 50));

  return (
    <>
      <nav aria-label="Tipo" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {[["", "Todos"], ...Object.entries(TYPE).map(([k, v]) => [k, v.label])].map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/estoque/movimentacoes${k ? `?tipo=${k}` : ""}`}
            aria-current={k === type ? "page" : undefined}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3.5 text-sm font-medium ${
              k === type ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900/80"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-amora-900/60">Nenhuma movimentação.</Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-amora-900/10">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className={`w-36 shrink-0 rounded-full px-2.5 py-1 text-center text-xs font-semibold ${TYPE[m.type].cls}`}>{TYPE[m.type].label}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-amora-950">{m.product_name ?? "Variação removida"}</span>
                  <span className="text-xs text-amora-900/55">
                    {m.color_name} · {m.size}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                </span>
                <span className="w-40 text-xs tabular-nums text-amora-900/70">
                  {m.delta_on_hand !== 0 && <span className="block">Em mãos {signed(m.delta_on_hand)} → {m.on_hand_after}</span>}
                  {m.delta_reserved !== 0 && <span className="block">Reserv. {signed(m.delta_reserved)} → {m.reserved_after}</span>}
                </span>
                <span className="w-44 text-right text-xs text-amora-900/55">
                  {dt.format(new Date(m.created_at))}
                  <span className="block">
                    {m.order_id ? (
                      <Link href={`/admin/pedidos/${m.order_id}`} className="text-amora-700 hover:underline">
                        ver pedido
                      </Link>
                    ) : (
                      m.actor ?? "Sistema"
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginação">
          <span className="text-amora-900/60">
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/estoque/movimentacoes?${new URLSearchParams({ ...(type && { tipo: type }), pagina: String(page - 1) })}`} className={adminButton("secondary")}>
                ← Anterior
              </Link>
            )}
            {page < pages && (
              <Link href={`/admin/estoque/movimentacoes?${new URLSearchParams({ ...(type && { tipo: type }), pagina: String(page + 1) })}`} className={adminButton("secondary")}>
                Próxima →
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
