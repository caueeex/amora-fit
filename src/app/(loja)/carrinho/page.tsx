import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Carrinho" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-8">
      <h1 className="mb-6 font-display text-3xl font-bold text-creme-50">Seu carrinho</h1>
      <CartView />
    </div>
  );
}
