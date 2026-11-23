"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ProductImage } from "@/components/loja/product-image";
import { buttonClasses } from "@/components/ui/button";
import { cartCount, cartSubtotal } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";
import { formatBRL } from "@/lib/domain/money";

const subscribeNoop = () => () => {};

/**
 * Carrinho: visualizar e ajustar. Preços aqui são de exibição; o checkout
 * confere tudo no servidor antes de criar o pedido.
 */
export function CartView() {
  const { items, setQuantity, remove } = useCart();
  // Evita "piscar" carrinho vazio antes de ler o localStorage.
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-amora-700/40" aria-hidden="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-14 text-center">
        <p className="font-display text-xl font-bold text-creme-50">Seu carrinho está vazio</p>
        <p className="mt-2 text-sm text-creme-100/70">Que tal dar uma olhada nas novidades?</p>
        <Link href="/produtos" className={`${buttonClasses({ size: "lg" })} mt-6`}>
          Ver produtos
        </Link>
      </div>
    );
  }

  const subtotal = cartSubtotal(items);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.variantId} className="flex gap-3 rounded-[var(--radius-card)] border border-creme-300/10 bg-amora-700/40 p-3 sm:gap-4">
            <Link href={`/produto/${item.slug}`} className="shrink-0">
              <ProductImage src={item.imageUrl} alt={item.name} sizes="96px" className="h-28 w-22 rounded-xl sm:w-24" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Link href={`/produto/${item.slug}`} className="line-clamp-2 font-semibold text-creme-50 hover:text-creme-300">
                {item.name}
              </Link>
              <p className="text-xs text-creme-100/70">
                Cor: {item.colorName} · Tamanho: {item.size}
              </p>
              <p className="text-sm font-semibold text-creme-300">{formatBRL(item.priceCents)}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <div className="flex h-10 items-center rounded-full border border-creme-300/25" role="group" aria-label={`Quantidade de ${item.name}`}>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                    className="grid h-10 w-10 place-items-center rounded-full text-lg text-creme-100 hover:bg-creme-300/10"
                    aria-label="Diminuir"
                  >
                    −
                  </button>
                  <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                    className="grid h-10 w-10 place-items-center rounded-full text-lg text-creme-100 hover:bg-creme-300/10"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="min-h-10 rounded-full px-3 text-xs text-creme-100/70 underline-offset-4 hover:text-creme-300 hover:underline"
                >
                  Remover
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/50 p-5 lg:sticky lg:top-40">
        <h2 className="mb-4 font-semibold text-creme-50">Resumo</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-creme-100/75">
              Subtotal ({cartCount(items)} {cartCount(items) === 1 ? "item" : "itens"})
            </dt>
            <dd className="font-semibold">{formatBRL(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-creme-100/75">Frete</dt>
            <dd className="text-creme-100/75">a combinar</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-creme-300/15 pt-3 text-base">
            <dt className="font-semibold">Total</dt>
            <dd className="font-bold text-creme-300">{formatBRL(subtotal)}</dd>
          </div>
        </dl>
        <Link href="/checkout" className={`${buttonClasses({ size: "lg" })} mt-5 w-full`}>
          Finalizar pedido
        </Link>
        <Link href="/produtos" className="mt-3 block text-center text-sm text-creme-200 underline-offset-4 hover:underline">
          Continuar comprando
        </Link>
        <p className="mt-4 text-xs leading-relaxed text-creme-100/60">
          Preços e disponibilidade são confirmados no momento do pedido.
        </p>
      </aside>
    </div>
  );
}
