import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/conta/status-badge";
import { buttonClasses } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/dal";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber, HAPPY_PATH, STATUS_HINT, STATUS_LABEL } from "@/lib/domain/order-status";
import { getOrderForCurrentUser, orderWhatsAppUrl } from "@/lib/orders/queries";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

const PAYMENT_METHOD: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  cash: "Dinheiro",
  bank_transfer: "Transferência",
  other: "Outro",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export default function OrderPage(props: PageProps<"/minha-conta/pedidos/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" aria-hidden="true" />}>
      <OrderContent {...props} />
    </Suspense>
  );
}

async function OrderContent({ params, searchParams }: PageProps<"/minha-conta/pedidos/[id]">) {
  const { id } = await params;
  await requireProfile(`/minha-conta/pedidos/${id}`);
  const [order, sp] = await Promise.all([getOrderForCurrentUser(id), searchParams]);
  if (!order) notFound();

  const isNew = sp.novo === "1";
  const waUrl = await orderWhatsAppUrl(order);
  const awaitingContact = order.status === "PENDING" || order.status === "AWAITING_PAYMENT";
  const a = order.shipping_address;
  const reached = new Set(order.history.map((h) => h.to_status));
  const cancelled = order.status === "CANCELLED";
  const payment = order.payments.find((p) => p.status === "confirmed");
  const shipment = order.shipments[0];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/minha-conta" className="text-sm text-creme-200 underline-offset-4 hover:underline">
        ← Meus pedidos
      </Link>

      {isNew && (
        <section className="rounded-[var(--radius-card)] border border-creme-300/40 bg-gradient-to-br from-amora-600/60 to-amora-800 p-6 text-center">
          <p className="font-display text-2xl font-bold text-creme-50">Pedido {formatOrderNumber(order.order_number)} registrado 💜</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-creme-100/80">
            Suas peças estão reservadas por até 48h. Envie a mensagem no WhatsApp para combinarmos frete e pagamento.
            Se a conversa não abriu, toque no botão abaixo.
          </p>
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClasses({ size: "lg" })} mt-5`}>
            Enviar pedido no WhatsApp
          </a>
        </section>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-creme-300">Pedido</p>
          <h1 className="font-display text-3xl font-bold text-creme-50">{formatOrderNumber(order.order_number)}</h1>
          <p className="text-sm text-creme-100/65">Feito em {dateTime.format(new Date(order.created_at))}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <p className="rounded-2xl border border-creme-300/15 bg-amora-700/40 p-4 text-sm text-creme-100/85">{STATUS_HINT[order.status]}</p>

      {!isNew && awaitingContact && (
        <a href={waUrl} target="_blank" rel="noopener noreferrer" className={buttonClasses({ variant: "secondary", className: "self-start" })}>
          Falar sobre este pedido no WhatsApp
        </a>
      )}

      {/* Linha do tempo */}
      <section aria-labelledby="timeline" className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5">
        <h2 id="timeline" className="mb-4 font-semibold text-creme-50">
          Acompanhamento
        </h2>
        {cancelled ? (
          <ol className="flex flex-col gap-3">
            {order.history.map((h) => (
              <li key={h.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-creme-300" aria-hidden="true" />
                <span>
                  <strong className="text-creme-50">{STATUS_LABEL[h.to_status]}</strong>
                  <span className="block text-xs text-creme-100/60">{dateTime.format(new Date(h.created_at))}</span>
                  {h.note && <span className="block text-xs text-creme-100/75">{h.note}</span>}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="flex flex-col">
            {HAPPY_PATH.map((s, i) => {
              const event = [...order.history].reverse().find((h) => h.to_status === s);
              const done = reached.has(s) || HAPPY_PATH.indexOf(order.status) > i;
              const current = order.status === s;
              return (
                <li key={s} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < HAPPY_PATH.length - 1 && (
                    <span className={`absolute left-[9px] top-5 h-full w-0.5 ${done ? "bg-creme-300/60" : "bg-creme-300/15"}`} aria-hidden="true" />
                  )}
                  <span
                    className={`relative mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      done ? "border-creme-300 bg-creme-300" : "border-creme-300/30 bg-amora-800"
                    } ${current ? "ring-4 ring-creme-300/25" : ""}`}
                    aria-hidden="true"
                  >
                    {done && <span className="h-1.5 w-1.5 rounded-full bg-amora-900" />}
                  </span>
                  <span className="text-sm">
                    <span className={done ? "font-semibold text-creme-50" : "text-creme-100/50"}>{STATUS_LABEL[s]}</span>
                    {current && <span className="sr-only"> (status atual)</span>}
                    {event && <span className="block text-xs text-creme-100/60">{dateTime.format(new Date(event.created_at))}</span>}
                    {event?.note && s !== "PENDING" && <span className="block text-xs text-creme-100/75">{event.note}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Itens */}
      <section aria-labelledby="itens" className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5">
        <h2 id="itens" className="mb-4 font-semibold text-creme-50">
          Itens
        </h2>
        <ul className="flex flex-col divide-y divide-creme-300/10">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
              <span>
                {i.product_slug ? (
                  <Link href={`/produto/${i.product_slug}`} className="font-medium text-creme-50 hover:text-creme-300">
                    {i.product_name}
                  </Link>
                ) : (
                  <span className="font-medium text-creme-50">{i.product_name}</span>
                )}
                <span className="block text-xs text-creme-100/65">
                  {i.color_name} · {i.size} · {i.quantity} × {formatBRL(i.unit_price_cents)}
                </span>
              </span>
              <span className="font-semibold">{formatBRL(i.line_total_cents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-1.5 border-t border-creme-300/15 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-creme-100/75">Subtotal</dt>
            <dd>{formatBRL(order.subtotal_cents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-creme-100/75">Frete</dt>
            <dd>{order.shipping_cents > 0 ? formatBRL(order.shipping_cents) : "a combinar"}</dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-creme-300">{formatBRL(order.total_cents)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5 text-sm leading-relaxed">
          <h2 className="mb-2 font-semibold text-creme-50">Entrega</h2>
          <p>
            {a.street}, {a.number}
            {a.complement ? ` – ${a.complement}` : ""}
            <br />
            {a.district} · {a.city}/{a.state}
            <br />
            CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
            <br />
            <span className="text-creme-100/65">Recebe: {a.recipient_name}</span>
          </p>
          {shipment && (shipment.carrier || shipment.tracking_code) && (
            <p className="mt-3 border-t border-creme-300/10 pt-3">
              {shipment.carrier && <>Transportadora: {shipment.carrier}<br /></>}
              {shipment.tracking_code && <>Rastreio: <strong>{shipment.tracking_code}</strong><br /></>}
              {shipment.tracking_url && (
                <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-creme-300 underline-offset-4 hover:underline">
                  Acompanhar envio →
                </a>
              )}
            </p>
          )}
        </section>
        <section className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5 text-sm leading-relaxed">
          <h2 className="mb-2 font-semibold text-creme-50">Pagamento</h2>
          {payment ? (
            <p>
              Confirmado{payment.confirmed_at ? ` em ${dateTime.format(new Date(payment.confirmed_at))}` : ""}
              <br />
              Forma: {PAYMENT_METHOD[payment.method] ?? payment.method}
              <br />
              Valor: {formatBRL(payment.amount_cents)}
            </p>
          ) : cancelled ? (
            <p className="text-creme-100/70">Pedido cancelado.</p>
          ) : (
            <p className="text-creme-100/80">Combinado pelo WhatsApp. Assim que a loja confirmar, aparece aqui.</p>
          )}
          {order.customer_note && (
            <p className="mt-3 border-t border-creme-300/10 pt-3 text-creme-100/75">Sua observação: {order.customer_note}</p>
          )}
        </section>
      </div>
    </div>
  );
}
