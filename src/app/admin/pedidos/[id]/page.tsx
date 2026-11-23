import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardTitle, StatusPill, adminButton } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber, STATUS_LABEL } from "@/lib/domain/order-status";
import { formatBrazilianPhone } from "@/lib/domain/phone";
import { whatsappUrl } from "@/lib/domain/whatsapp";
import { getOrderForCurrentUser } from "@/lib/orders/queries";
import { OrderActions } from "./order-actions";

export const metadata: Metadata = { title: "Pedido" };

const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const METHOD: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", cash: "Dinheiro", bank_transfer: "Transferência", other: "Outro" };

export default function AdminOrderPage(props: PageProps<"/admin/pedidos/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params }: PageProps<"/admin/pedidos/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderForCurrentUser(id);
  if (!order) notFound();

  const a = order.shipping_address;
  const payment = order.payments.find((p) => p.status === "confirmed");
  const shipment = order.shipments[0];
  const expires = order.reservation_expires_at ? new Date(order.reservation_expires_at) : null;
  const customerWa =
    order.customer_phone && /^\d{10,13}$/.test(order.customer_phone)
      ? whatsappUrl(
          order.customer_phone.startsWith("55") ? order.customer_phone : `55${order.customer_phone}`,
          `Olá, ${order.customer_name.split(" ")[0]}! Aqui é da Amora Fit 💜 Sobre o seu pedido ${formatOrderNumber(order.order_number)}:`,
        )
      : null;

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm font-medium text-amora-700 hover:underline">
        ← Pedidos
      </Link>

      <header className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-amora-950">Pedido {formatOrderNumber(order.order_number)}</h1>
          <p className="mt-1 text-sm text-amora-900/60">Recebido em {dt.format(new Date(order.created_at))}</p>
        </div>
        <StatusPill status={order.status} />
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Ações</CardTitle>
            {expires && (order.status === "PENDING" || order.status === "AWAITING_PAYMENT") && (
              <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                ⏱ Peças reservadas até {dt.format(expires)}. Sem confirmação de pagamento até lá, o pedido é cancelado automaticamente e as peças voltam ao estoque.
              </p>
            )}
            <OrderActions orderId={order.id} status={order.status} shipment={shipment} />
          </Card>

          <Card>
            <CardTitle>Itens</CardTitle>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-left text-xs text-amora-900/55">
                  <tr>
                    <th className="pb-2 font-medium">Produto</th>
                    <th className="pb-2 font-medium">Cor / Tam.</th>
                    <th className="pb-2 text-right font-medium">Qtd.</th>
                    <th className="pb-2 text-right font-medium">Unit.</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amora-900/10">
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2.5 pr-3 text-amora-950">{i.product_name}</td>
                      <td className="py-2.5 pr-3 text-amora-900/70">
                        {i.color_name} · {i.size}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{i.quantity}</td>
                      <td className="py-2.5 text-right tabular-nums">{formatBRL(i.unit_price_cents)}</td>
                      <td className="py-2.5 text-right font-semibold tabular-nums">{formatBRL(i.line_total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 flex flex-col gap-1 border-t border-amora-900/10 pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-amora-900/60">Subtotal</dt>
                <dd className="tabular-nums">{formatBRL(order.subtotal_cents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-amora-900/60">Frete</dt>
                <dd>{order.shipping_cents ? formatBRL(order.shipping_cents) : "a combinar"}</dd>
              </div>
              <div className="flex justify-between text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold tabular-nums">{formatBRL(order.total_cents)}</dd>
              </div>
            </dl>
            {order.customer_note && <p className="mt-4 rounded-xl bg-amora-100/30 p-3 text-sm text-amora-900">💬 Observação da cliente: {order.customer_note}</p>}
          </Card>

          <Card>
            <CardTitle>Histórico</CardTitle>
            <ol className="flex flex-col gap-3">
              {order.history.map((h) => (
                <li key={h.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amora-500" aria-hidden="true" />
                  <span>
                    <strong className="text-amora-950">
                      {h.from_status ? `${STATUS_LABEL[h.from_status]} → ` : ""}
                      {STATUS_LABEL[h.to_status]}
                    </strong>
                    <span className="block text-xs text-amora-900/55">
                      {dt.format(new Date(h.created_at))} · {h.changed_by === null ? "Sistema" : h.changed_by === order.customer_id ? "Cliente" : "Equipe"}
                    </span>
                    {h.note && <span className="block text-amora-900/75">{h.note}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Cliente</CardTitle>
            <p className="font-semibold text-amora-950">{order.customer_name}</p>
            {order.customer_email && <p className="text-sm text-amora-900/70">{order.customer_email}</p>}
            {order.customer_phone && <p className="text-sm text-amora-900/70">{formatBrazilianPhone(order.customer_phone)}</p>}
            {customerWa && (
              <a href={customerWa} target="_blank" rel="noopener noreferrer" className={adminButton("secondary", "mt-4 w-full")}>
                Conversar no WhatsApp
              </a>
            )}
          </Card>

          <Card>
            <CardTitle>Entrega</CardTitle>
            <p className="text-sm leading-relaxed text-amora-900/85">
              {a.recipient_name}
              <br />
              {a.street}, {a.number}
              {a.complement ? ` – ${a.complement}` : ""}
              <br />
              {a.district} · {a.city}/{a.state}
              <br />
              CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
              {a.phone && (
                <>
                  <br />
                  Tel. {formatBrazilianPhone(a.phone)}
                </>
              )}
            </p>
            {shipment && (shipment.carrier || shipment.tracking_code) && (
              <p className="mt-3 border-t border-amora-900/10 pt-3 text-sm">
                {shipment.carrier && <>Transportadora: {shipment.carrier}<br /></>}
                {shipment.tracking_code && <>Rastreio: <strong>{shipment.tracking_code}</strong><br /></>}
                {shipment.shipped_at && <>Enviado em {dt.format(new Date(shipment.shipped_at))}</>}
              </p>
            )}
          </Card>

          <Card>
            <CardTitle>Pagamento</CardTitle>
            {payment ? (
              <p className="text-sm text-amora-900/85">
                ✓ Confirmado {payment.confirmed_at ? `em ${dt.format(new Date(payment.confirmed_at))}` : ""}
                <br />
                {METHOD[payment.method] ?? payment.method} · {formatBRL(payment.amount_cents)}
              </p>
            ) : (
              <p className="text-sm text-amora-900/60">Ainda não confirmado.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
