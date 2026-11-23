"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** Cor escolhida no produto, compartilhada entre a galeria e o painel de compra. */
type Ctx = { color: string; setColor: (c: string) => void };
const ProductColorContext = createContext<Ctx | null>(null);

export function ProductColorProvider({ initialColor, children }: { initialColor: string; children: ReactNode }) {
  const [color, setColor] = useState(initialColor);
  return <ProductColorContext value={{ color, setColor }}>{children}</ProductColorContext>;
}

export function useProductColor(): Ctx {
  const ctx = useContext(ProductColorContext);
  if (!ctx) throw new Error("useProductColor precisa de ProductColorProvider");
  return ctx;
}
