"use client";

import Link from "next/link";
import { cartCount, cartSubtotal } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";
import { formatBRL } from "@/lib/domain/money";

export function CartButton() {
  const { items } = useCart();
  const count = cartCount(items);

  return (
    <Link
      href="/carrinho"
      className="group flex h-11 items-center gap-2 rounded-full pl-2.5 pr-2.5 text-creme-100 transition-colors hover:bg-creme-300/10 hover:text-creme-300 lg:pr-4"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}, ${formatBRL(cartSubtotal(items))}` : "Carrinho vazio"}
    >
      <span className="relative">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" strokeLinejoin="round" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-creme-300 px-1 text-[11px] font-bold text-amora-900 animate-[pop_250ms_var(--ease-suave)]">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span className="hidden text-sm lg:inline" aria-hidden="true">
        Carrinho <span className="font-semibold text-creme-300">{formatBRL(cartSubtotal(items))}</span>
      </span>
    </Link>
  );
}
