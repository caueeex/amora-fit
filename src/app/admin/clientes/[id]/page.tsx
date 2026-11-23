import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardTitle, StatusPill, adminButton } from "@/components/admin/ui";
import { getCustomer } from "@/lib/admin/customers";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber } from "@/lib/domain/order-status";
import { formatBrazilianPhone } from "@/lib/domain/phone";
import { whatsappUrl } from "@/lib/domain/whatsapp";
import { RevealCpf } from "./reveal-cpf";

export const metadata: Metadata = { title: "Cliente" };

const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const d = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" });

export default function CustomerPage(props: PageProps<"/admin/clientes/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const c = await getCustomer(id);
  if (!c) notFound();
  const ticket = c.paid_count ? Math.round(c.total_spent_cents / c.paid_count) : 0;
  const wa = c.phone && /^\d{10,13}$/.test(c.phone) ? whatsappUrl(c.phone.startsWith("55") ? c.phone : `55${c.phone}`, `Olá, ${c.full_name.split(" ")[0] || ""}! Aqui é da Amora Fit 💜`) : null;

  return (
    <>
      <Link href="/admin/clientes" className="text-sm font-medium text-amora-700 hover:underline">
        ← Clientes
      </Link>
      <header className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-amora-950">{c.full_name || "Sem nome"}</h1>
          <p className="mt-1 text-sm text-amora-900/60">Cliente desde {d.format(new Date(c.created_at))}</p>
        </div>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className={adminButton("primary")}>
            Conversar no WhatsApp
          </a>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Total gasto", formatBRL(c.total_spent_cents)],
          ["Pedidos", String(c.orders_count)],
          ["Pagos", String(c.paid_count)],
          ["Ticket médio", formatBRL(ticket)],
        ].map(([label, value]) => (
          <Card key={label} className="flex flex-col gap-1">
            <span className="text-xs text-amora-900/60">{label}</span>
            <span className="font-display text-2xl font-bold tabular-nums">{value}</span>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardTitle>Pedidos</CardTitle>
          {c.orders.length === 0 ? (
            <p className="text-sm text-amora-900/55">Nenhum pedido ainda.</p>
          ) : (
            <ul className="divide-y divide-amora-900/10">
              {c.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm hover:bg-amora-100/20">
                    <span className="w-20 font-semibold tabular-nums">{formatOrderNumber(o.order_number)}</span>
                    <span className="flex-1 tabular-nums text-amora-900/60">{dt.format(new Date(o.created_at))}</span>
                    <span className="w-24 text-right font-semibold tabular-nums">{formatBRL(o.total_cents)}</span>
                    <StatusPill status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Dados</CardTitle>
            <dl className="grid grid-cols-[6rem_1fr] gap-y-2 text-sm">
              <dt className="text-amora-900/55">E-mail</dt>
              <dd className="break-all">{c.email ?? "—"}</dd>
              <dt className="text-amora-900/55">WhatsApp</dt>
              <dd>{c.phone ? formatBrazilianPhone(c.phone) : "—"}</dd>
              <dt className="text-amora-900/55">CPF</dt>
              <dd>{c.cpf ? <RevealCpf cpf={c.cpf} /> : "—"}</dd>
              <dt className="text-amora-900/55">Perfil</dt>
              <dd>{c.role === "admin" ? "Administrador" : "Cliente"}</dd>
            </dl>
          </Card>

          <Card>
            <CardTitle>Endereços</CardTitle>
            {c.addresses.length === 0 ? (
              <p className="text-sm text-amora-900/55">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {c.addresses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-amora-900/10 p-3 text-sm leading-relaxed">
                    <strong className="text-amora-950">{a.label}</strong>
                    {a.is_default && <span className="ml-2 rounded-full bg-amora-100/60 px-2 py-0.5 text-[11px]">padrão</span>}
                    <br />
                    {a.street}, {a.number}
                    {a.complement ? ` – ${a.complement}` : ""} · {a.district}
                    <br />
                    {a.city}/{a.state} · CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
                    <br />
                    <span className="text-amora-900/60">Recebe: {a.recipient_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <p className="mt-6 text-xs text-amora-900/45">Dados pessoais visíveis apenas para administradores. Use-os somente para atender os pedidos (LGPD).</p>
    </>
  );
}
