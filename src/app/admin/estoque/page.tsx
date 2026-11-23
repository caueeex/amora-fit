import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, adminButton } from "@/components/admin/ui";
import { listStock } from "@/lib/admin/stock";
import { StockRow } from "./stock-row";

export const metadata: Metadata = { title: "Estoque" };

const FILTERS = [
  { id: "ativos", label: "Ativas" },
  { id: "baixo", label: "Estoque baixo" },
  { id: "esgotado", label: "Esgotadas" },
  { id: "inativos", label: "Inativas" },
  { id: "todos", label: "Todas" },
] as const;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function StockPage(props: PageProps<"/admin/estoque">) {
  return (
    <>
      <PageHeader
        title="Estoque"
        description="Quantidade por cor e tamanho. Reservado = peças em pedidos aguardando pagamento."
        actions={
          <Link href="/admin/estoque/movimentacoes" className={adminButton("secondary")}>
            Histórico de movimentações
          </Link>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <List {...props} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: PageProps<"/admin/estoque">) {
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.id === one(sp.filtro)) ? one(sp.filtro)! : "ativos";
  const q = one(sp.q) ?? "";
  const rows = await listStock({ q, filter });
  const totals = rows.reduce((t, r) => ({ on_hand: t.on_hand + r.on_hand, reserved: t.reserved + r.reserved, available: t.available + r.available }), { on_hand: 0, reserved: 0, available: 0 });

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filtro" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {FILTERS.map((f) => (
            <Link
              key={f.id}
              href={`/admin/estoque?filtro=${f.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              aria-current={f.id === filter ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3.5 text-sm font-medium ${
                f.id === filter ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900/80 hover:border-amora-800/40"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2">
          <input type="hidden" name="filtro" value={filter} />
          <input name="q" defaultValue={q} placeholder="Produto, cor ou tamanho" aria-label="Buscar no estoque" className="min-h-10 w-full rounded-xl border border-amora-900/15 bg-white px-3 text-sm lg:w-64" />
          <button className={adminButton("primary")}>Buscar</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <Card className="py-12 text-center text-sm text-amora-900/60">Nenhuma variação nesta visão.</Card>
      ) : (
        <>
          <div className="mb-2 hidden grid-cols-[minmax(0,1.6fr)_repeat(3,5.5rem)_5rem_6rem_7.5rem] gap-x-4 px-3 text-xs font-medium text-amora-900/55 md:grid">
            <span>Produto</span>
            <span className="text-right">Em mãos</span>
            <span className="text-right">Reservado</span>
            <span className="text-right">Disponível</span>
            <span className="text-right">Mínimo</span>
            <span />
            <span>Situação</span>
          </div>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <StockRow key={r.variant_id} row={r} />
            ))}
          </ul>
          <p className="mt-4 text-xs text-amora-900/55">
            {rows.length} variação(ões) · {totals.on_hand} em mãos · {totals.reserved} reservadas · {totals.available} disponíveis para venda
          </p>
        </>
      )}
    </>
  );
}
