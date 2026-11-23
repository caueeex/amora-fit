"use client";

import Link from "next/link";
import { cartCount } from "@/lib/cart/cart";
import { useCart } from "@/lib/cart/store";

export function CartButton() {
  const { items } = useCart();
  const count = cartCount(items);

  return (
    <Link
      href="/carrinho"
      className="relative grid h-11 w-11 place-items-center rounded-full text-creme-100 transition-colors hover:bg-creme-300/10"
      aria-label={count ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho vazio"}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8Z" strokeLinejoin="round" />
        <path d="M9 10V7a3 3 0 0 1 6 0v3" strokeLinecap="round" />
      </svg>
      {count > 0 && (
        <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-creme-300 px-1 text-[11px] font-bold text-amora-900 animate-[pop_250ms_var(--ease-suave)]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
