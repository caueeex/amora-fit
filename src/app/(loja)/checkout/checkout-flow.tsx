"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ProductImage } from "@/components/loja/product-image";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { useCart } from "@/lib/cart/store";
import { addCents, formatBRL, multiplyCents } from "@/lib/domain/money";
import { uuidv4 } from "@/lib/uuid";
import { placeOrderAction, quoteCartAction, type QuoteLine, type SavedAddress } from "./actions";
import { AddressForm } from "./address-form";

const subscribeNoop = () => () => {};

/** Chave de idempotência estável para o MESMO carrinho (evita pedido duplicado em duplo clique/refresh). */
function useIdempotencyKey(signature: string): string {
  return useMemo(() => {
    if (typeof window === "undefined" || !signature) return "";
    const KEY = "amora-fit:checkout-key";
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { signature: string; key: string } | null;
      if (saved?.signature === signature) return saved.key;
      const key = uuidv4();
      sessionStorage.setItem(KEY, JSON.stringify({ signature, key }));
      return key;
    } catch {
      return uuidv4();
    }
  }, [signature]);
}

export function CheckoutFlow({
  contact: initialContact,
  initialAddresses,
}: {
  contact: { fullName: string; phone: string; email: string };
  initialAddresses: SavedAddress[];
}) {
  const router = useRouter();
  const { items, setQuantity, remove, clear } = useCart();
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const [contact, setContact] = useState({ fullName: initialContact.fullName, phone: initialContact.phone });
  const [contactErrors, setContactErrors] = useState<Partial<Record<string, string>>>({});
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState<string | null>(initialAddresses[0]?.id ?? null);
  const [showAddressForm, setShowAddressForm] = useState(initialAddresses.length === 0);
  const [note, setNote] = useState("");

  const [quote, setQuote] = useState<QuoteLine[] | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: string; whatsappUrl: string; opened: boolean } | null>(null);

  const signature = useMemo(() => items.map((i) => `${i.variantId}:${i.quantity}`).sort().join("|"), [items]);
  const idempotencyKey = useIdempotencyKey(signature);

  // Bumping quoteVersion força uma nova cotação (ex.: após o servidor recusar por estoque).
  const [quoteVersion, setQuoteVersion] = useState(0);
  const refreshQuote = useCallback(() => setQuoteVersion((v) => v + 1), []);

  useEffect(() => {
    if (!hydrated || done || items.length === 0) return;
    let stale = false;
    quoteCartAction(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }))).then((r) => {
      if (stale) return; // resposta antiga chegando fora de ordem
      if ("error" in r) {
        setQuoteError(r.error);
      } else {
        setQuoteError(null);
        setQuote(r.lines);
      }
    });
    return () => {
      stale = true;
    };
  }, [hydrated, done, items, quoteVersion]);

  const problems = quote?.filter((l) => !l.ok) ?? [];
  const subtotal = quote ? addCents(...quote.filter((l) => l.ok).map((l) => multiplyCents(l.unitPriceCents, l.quantity))) : 0;

  function fixCart() {
    for (const p of problems) {
      if (p.available > 0) setQuantity(p.variantId, p.available);
      else remove(p.variantId);
    }
  }

  async function submit() {
    setError(null);
    setContactErrors({});
    if (!addressId) {
      setError("Escolha ou cadastre o endereço de entrega.");
      return;
    }
    if (problems.length) {
      setError("Ajuste os itens indisponíveis antes de continuar.");
      return;
    }

    // Abre a aba já no clique (gesto do usuário), para o navegador não bloquear o pop-up.
    const popup = window.open("", "_blank");
    if (popup) {
      popup.opener = null;
      popup.document.title = "Abrindo WhatsApp…";
      popup.document.body.innerHTML =
        '<p style="font-family:system-ui;padding:24px;color:#560832">Registrando seu pedido e abrindo o WhatsApp…</p>';
    }

    setSubmitting(true);
    const r = await placeOrderAction({
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      addressId,
      idempotencyKey,
      note: note || undefined,
      contact,
    });
    setSubmitting(false);

    if (!r.ok) {
      popup?.close();
      setError(r.error);
      if (r.fieldErrors) setContactErrors(r.fieldErrors);
      if (r.stockProblems?.length) refreshQuote();
      return;
    }

    // Pedido JÁ está gravado no banco. Só agora abrimos o WhatsApp.
    if (popup) popup.location.href = r.whatsappUrl;
    setDone({ orderId: r.orderId, whatsappUrl: r.whatsappUrl, opened: Boolean(popup) });
    clear();
    try {
      sessionStorage.removeItem("amora-fit:checkout-key");
    } catch {}
    router.push(`/minha-conta/pedidos/${r.orderId}?novo=1`);
  }

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" aria-hidden="true" />;

  if (done) {
    return (
      <div className="rounded-[var(--radius-card)] border border-creme-300/30 bg-amora-700/50 p-8 text-center">
        <p className="font-display text-2xl font-bold text-creme-50">Pedido registrado! 💜</p>
        <p className="mt-2 text-sm text-creme-100/75">Abrindo os detalhes do seu pedido…</p>
        <a href={done.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${buttonClasses({ size: "lg" })} mt-6`}>
          Enviar no WhatsApp
        </a>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-14 text-center">
        <p className="font-display text-xl font-bold text-creme-50">Seu carrinho está vazio</p>
        <Link href="/produtos" className={`${buttonClasses({ size: "lg" })} mt-6`}>
          Ver produtos
        </Link>
      </div>
    );
  }

  const selected = addresses.find((a) => a.id === addressId);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="flex flex-col gap-6">
        {/* 1. Contato */}
        <section className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5">
          <h2 className="mb-4 flex items-center gap-3 font-semibold text-creme-50">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-creme-300 text-sm font-bold text-amora-900">1</span>
            Seus dados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" name="fullName" autoComplete="name" value={contact.fullName} onChange={(e) => setContact((c) => ({ ...c, fullName: e.target.value }))} error={contactErrors.fullName} />
            <Field label="WhatsApp" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(12) 99999-9999" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} error={contactErrors.phone} />
          </div>
          {initialContact.email && <p className="mt-3 text-xs text-creme-100/60">Conta: {initialContact.email}</p>}
        </section>

        {/* 2. Endereço */}
        <section className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5">
          <h2 className="mb-4 flex items-center gap-3 font-semibold text-creme-50">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-creme-300 text-sm font-bold text-amora-900">2</span>
            Endereço de entrega
          </h2>

          {addresses.length > 0 && (
            <fieldset className="mb-4 flex flex-col gap-2">
              <legend className="sr-only">Escolha o endereço</legend>
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer gap-3 rounded-2xl border border-creme-300/15 p-4 transition-colors hover:border-creme-300/40 has-[:checked]:border-creme-300 has-[:checked]:bg-creme-300/10"
                >
                  <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 h-4 w-4 accent-creme-300" />
                  <span className="text-sm leading-relaxed">
                    <strong className="text-creme-50">{a.label}</strong>
                    {a.is_default && <span className="ml-2 rounded-full bg-creme-300/15 px-2 py-0.5 text-[11px] text-creme-300">padrão</span>}
                    <br />
                    {a.street}, {a.number}
                    {a.complement ? ` – ${a.complement}` : ""} · {a.district}
                    <br />
                    {a.city}/{a.state} · CEP {a.cep.replace(/(\d{5})(\d{3})/, "$1-$2")}
                    <br />
                    <span className="text-creme-100/60">Recebe: {a.recipient_name}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {showAddressForm ? (
            <AddressForm
              defaultRecipient={contact.fullName}
              defaultPhone={contact.phone}
              onSaved={(a) => {
                setAddresses((list) => [a, ...list.map((x) => (a.is_default ? { ...x, is_default: false } : x))]);
                setAddressId(a.id);
                setShowAddressForm(false);
              }}
              onCancel={addresses.length ? () => setShowAddressForm(false) : undefined}
            />
          ) : (
            <Button type="button" variant="secondary" onClick={() => setShowAddressForm(true)}>
              + Novo endereço
            </Button>
          )}
        </section>

        {/* 3. Observação */}
        <section className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 p-5">
          <label htmlFor="note" className="mb-2 flex items-center gap-3 font-semibold text-creme-50">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-creme-300 text-sm font-bold text-amora-900">3</span>
            Observação <span className="text-sm font-normal text-creme-100/60">(opcional)</span>
          </label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="Ex.: prefiro retirar pessoalmente, melhor horário para entrega…"
            className="w-full rounded-xl border border-creme-300/20 bg-amora-950/40 p-3 text-sm text-creme-50 placeholder:text-creme-100/40 focus:border-creme-300 focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-creme-100/50">{note.length}/500</p>
        </section>
      </div>

      {/* Resumo */}
      <aside className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/50 p-5 lg:sticky lg:top-40">
        <h2 className="mb-4 font-semibold text-creme-50">Resumo do pedido</h2>

        {quoteError && <Notice tone="error">{quoteError}</Notice>}
        {!quote && !quoteError && <div className="h-32 animate-pulse rounded-xl bg-creme-300/10" aria-hidden="true" />}

        {quote && (
          <>
            <ul className="flex flex-col gap-3">
              {quote.map((l) => {
                const fallback = items.find((i) => i.variantId === l.variantId);
                return (
                  <li key={l.variantId} className={`flex gap-3 ${l.ok ? "" : "opacity-70"}`}>
                    <ProductImage src={l.imageUrl ?? fallback?.imageUrl} alt="" sizes="56px" className="h-16 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-medium text-creme-50">{l.productName || fallback?.name}</p>
                      <p className="text-xs text-creme-100/65">
                        {l.colorName || fallback?.colorName} · {l.size || fallback?.size} · {l.quantity}×
                      </p>
                      {!l.ok && (
                        <p className="text-xs font-medium text-amora-300">
                          {l.reason === "insufficient_stock" ? `Só ${l.available} disponível(is)` : "Indisponível"}
                        </p>
                      )}
                    </div>
                    {l.ok && <p className="text-sm font-semibold text-creme-100">{formatBRL(multiplyCents(l.unitPriceCents, l.quantity))}</p>}
                  </li>
                );
              })}
            </ul>

            {problems.length > 0 && (
              <div className="mt-4">
                <Notice tone="error">
                  Alguns itens mudaram de disponibilidade.{" "}
                  <button type="button" onClick={fixCart} className="font-semibold underline underline-offset-4">
                    Ajustar carrinho
                  </button>
                </Notice>
              </div>
            )}

            <dl className="mt-5 flex flex-col gap-2 border-t border-creme-300/15 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-creme-100/75">Subtotal</dt>
                <dd className="font-semibold">{formatBRL(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-creme-100/75">Frete</dt>
                <dd className="text-creme-100/75">a combinar no WhatsApp</dd>
              </div>
              <div className="mt-1 flex justify-between text-base">
                <dt className="font-semibold">Total</dt>
                <dd className="font-bold text-creme-300">{formatBRL(subtotal)}</dd>
              </div>
            </dl>
          </>
        )}

        {selected && (
          <p className="mt-4 rounded-xl bg-amora-950/30 p-3 text-xs leading-relaxed text-creme-100/75">
            Entrega em: {selected.street}, {selected.number} – {selected.city}/{selected.state}
          </p>
        )}

        {error && (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        <Button type="button" size="lg" className="mt-5 w-full" onClick={submit} loading={submitting} disabled={!quote || problems.length > 0 || !idempotencyKey}>
          {submitting ? "Registrando pedido…" : "Confirmar e enviar no WhatsApp"}
        </Button>
        <p className="mt-3 text-xs leading-relaxed text-creme-100/60">
          Seu pedido é registrado e reservamos as peças por até 48h. Em seguida abrimos o WhatsApp da loja com o resumo
          para combinar frete e pagamento.
        </p>
        <Link href="/carrinho" className="mt-3 block text-center text-sm text-creme-200 underline-offset-4 hover:underline">
          Voltar ao carrinho
        </Link>
      </aside>
    </div>
  );
}
