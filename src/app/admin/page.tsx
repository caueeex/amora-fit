import Link from "next/link";
import { Suspense } from "react";
import { SalesChart } from "@/components/admin/sales-chart";
import { Card, CardTitle, PageHeader, StatusPill } from "@/components/admin/ui";
import { getDashboard, listAdminOrders } from "@/lib/admin/queries";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber, STATUS_LABEL, type OrderStatus } from "@/lib/domain/order-status";

const PERIODS = [7, 30, 90] as const;
const dateTime = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function AdminDashboardPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
      <Dashboard {...props} />
    </Suspense>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-medium text-amora-900/60">{label}</span>
      <span className="font-display text-2xl font-bold tabular-nums text-amora-950 sm:text-3xl">{value}</span>
      {hint && <span className="text-xs text-amora-900/50">{hint}</span>}
    </Card>
  );
}

async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const days = PERIODS.find((p) => String(p) === sp.periodo) ?? 30;
  const [d, recent] = await Promise.all([getDashboard(days), listAdminOrders({ tab: "todos", page: 1 })]);
  if (!d) {
    return (
      <Card>
        <CardTitle>Falta um passo no banco</CardTitle>
        <p className="text-sm text-amora-900/75">
          Para ver os indicadores, rode no SQL Editor do Supabase o arquivo{" "}
          <code className="rounded bg-amora-100/50 px-1">supabase/migrations/20261122000010_admin_dashboard.sql</code>.
        </p>
        <Link href="/admin/pedidos" className="mt-4 inline-block text-sm font-semibold text-amora-700 hover:underline">Enquanto isso, ver pedidos →</Link>
      </Card>
    );
  }

  const ticket = d.paid_count ? Math.round(d.revenue_cents / d.paid_count) : 0;
  const pipeline: { status: OrderStatus; href: string }[] = [
    { status: "PENDING", href: "/admin/pedidos?aba=novos" },
    { status: "AWAITING_PAYMENT", href: "/admin/pedidos?aba=pagamento" },
    { status: "PAID", href: "/admin/pedidos?aba=andamento" },
    { status: "PROCESSING", href: "/admin/pedidos?aba=andamento" },
    { status: "INVOICED", href: "/admin/pedidos?aba=andamento" },
    { status: "SHIPPED", href: "/admin/pedidos?aba=andamento" },
    { status: "COMPLETED", href: "/admin/pedidos?aba=concluidos" },
  ];
  const maxTop = Math.max(1, ...d.top_products.map((t) => t.quantity));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral das vendas e da operação."
        actions={
          <div className="flex rounded-xl border border-amora-900/15 bg-white p-1" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?periodo=${p}`}
                aria-current={p === days ? "true" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${p === days ? "bg-amora-800 text-creme-50" : "text-amora-900/70 hover:bg-amora-100/50"}`}
              >
                {p} dias
              </Link>
            ))}
          </div>
        }
      />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento" value={formatBRL(d.revenue_cents)} hint="Pagamentos confirmados" />
        <Kpi label="Pedidos recebidos" value={String(d.orders_count)} hint={`${d.cancelled_count} cancelado(s)`} />
        <Kpi label="Ticket médio" value={formatBRL(ticket)} hint={`${d.paid_count} pedido(s) pago(s)`} />
        <Kpi label="Peças vendidas" value={String(d.items_sold)} hint={`Últimos ${days} dias`} />
      </div>

      {/* Operação agora */}
      <Card className="mt-4">
        <CardTitle>Operação agora</CardTitle>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {pipeline.map(({ status, href }) => (
            <li key={status}>
              <Link href={href} className="flex h-full flex-col gap-2 rounded-xl border border-amora-900/10 p-3 transition-colors hover:border-amora-800/40 hover:bg-amora-100/30">
                <span className="font-display text-2xl font-bold tabular-nums text-amora-950">{d.status_now[status] ?? 0}</span>
                <StatusPill status={status} />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle>Faturamento por dia</CardTitle>
          <SalesChart data={d.daily} />
        </Card>

        <Card>
          <CardTitle>Mais vendidos</CardTitle>
          {d.top_products.length === 0 ? (
            <p className="text-sm text-amora-900/55">Nenhuma venda confirmada no período.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {d.top_products.map((t, i) => (
                <li key={t.name} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-amora-950">
                      <span className="mr-2 text-amora-900/45 tabular-nums">{i + 1}.</span>
                      {t.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-amora-900/70">
                      {t.quantity} un · {formatBRL(t.revenue_cents)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-amora-100/60" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${(t.quantity / maxTop) * 100}%`, backgroundColor: "#A3426F" }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle action={<Link href="/admin/pedidos" className="text-sm font-semibold text-amora-700 hover:underline">Ver todos →</Link>}>
            Últimos pedidos
          </CardTitle>
          {recent.rows.length === 0 ? (
            <p className="text-sm text-amora-900/55">Nenhum pedido ainda.</p>
          ) : (
            <ul className="divide-y divide-amora-900/10">
              {recent.rows.slice(0, 6).map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:bg-amora-100/20">
                    <span className="w-20 font-semibold tabular-nums text-amora-950">{formatOrderNumber(o.order_number)}</span>
                    <span className="min-w-0 flex-1 truncate text-amora-900/80">{o.customer_name}</span>
                    <span className="tabular-nums text-amora-900/60">{dateTime.format(new Date(o.created_at))}</span>
                    <span className="w-24 text-right font-semibold tabular-nums">{formatBRL(o.total_cents)}</span>
                    <StatusPill status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardTitle>
            Estoque baixo{" "}
            {d.low_stock_count > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{d.low_stock_count}</span>}
          </CardTitle>
          {d.low_stock.length === 0 ? (
            <p className="text-sm text-amora-900/55">Tudo certo: nenhuma variação abaixo do mínimo.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-amora-900/10 text-sm">
              {d.low_stock.map((l) => (
                <li key={`${l.product_id}-${l.color_name}-${l.size}`}>
                  <Link href={`/admin/estoque?filtro=baixo&q=${encodeURIComponent(l.product_name)}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-amora-100/20">
                  <span className="min-w-0">
                    <span className="block truncate text-amora-950">{l.product_name}</span>
                    <span className="text-xs text-amora-900/55">
                      {l.color_name} · {l.size}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${l.available === 0 ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>
                    {l.available === 0 ? "⚠ Esgotado" : `⚠ ${l.available} restante(s)`}
                  </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs text-amora-900/45">
        Faturamento considera pedidos com pagamento confirmado ({STATUS_LABEL.PAID.toLowerCase()} em diante). “Faturado” é uma marcação interna, não emissão de nota fiscal.
      </p>
    </>
  );
}
