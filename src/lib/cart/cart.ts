import { addCents, multiplyCents, type Cents } from "@/lib/domain/money";

/**
 * Item do carrinho. A chave é variantId (= produto + cor + tamanho).
 * priceCents é só para EXIBIÇÃO: o servidor recalcula tudo ao criar o pedido.
 */
export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  size: string;
  priceCents: Cents;
  imageUrl: string | null;
  quantity: number;
};

export const MAX_QTY_PER_ITEM = 99;
export const MAX_CART_LINES = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Descarta itens corrompidos/adulterados lidos do localStorage. */
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const out: CartItem[] = [];
  const seen = new Set<string>();
  for (const v of value) {
    if (!v || typeof v !== "object") continue;
    const i = v as Record<string, unknown>;
    if (typeof i.variantId !== "string" || !UUID.test(i.variantId) || seen.has(i.variantId)) continue;
    if (typeof i.productId !== "string" || typeof i.slug !== "string" || typeof i.name !== "string") continue;
    if (typeof i.colorName !== "string" || typeof i.size !== "string") continue;
    if (!Number.isSafeInteger(i.priceCents) || (i.priceCents as number) < 0) continue;
    if (!Number.isSafeInteger(i.quantity) || (i.quantity as number) < 1) continue;
    seen.add(i.variantId);
    out.push({
      variantId: i.variantId,
      productId: i.productId,
      slug: i.slug,
      name: i.name.slice(0, 120),
      colorName: i.colorName.slice(0, 40),
      size: i.size.slice(0, 4),
      priceCents: i.priceCents as number,
      imageUrl: typeof i.imageUrl === "string" ? i.imageUrl : null,
      quantity: Math.min(i.quantity as number, MAX_QTY_PER_ITEM),
    });
    if (out.length >= MAX_CART_LINES) break;
  }
  return out;
}

export function addItem(items: CartItem[], item: Omit<CartItem, "quantity">, quantity: number, maxAvailable = MAX_QTY_PER_ITEM): CartItem[] {
  const limit = Math.max(0, Math.min(maxAvailable, MAX_QTY_PER_ITEM));
  const existing = items.find((i) => i.variantId === item.variantId);
  if (existing) {
    const q = Math.min(existing.quantity + quantity, limit);
    return items.map((i) => (i.variantId === item.variantId ? { ...i, ...item, quantity: Math.max(q, 1) } : i));
  }
  if (items.length >= MAX_CART_LINES || limit < 1) return items;
  return [...items, { ...item, quantity: Math.max(1, Math.min(quantity, limit)) }];
}

export function setQuantity(items: CartItem[], variantId: string, quantity: number): CartItem[] {
  if (quantity < 1) return removeItem(items, variantId);
  return items.map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(quantity, MAX_QTY_PER_ITEM) } : i));
}

export function removeItem(items: CartItem[], variantId: string): CartItem[] {
  return items.filter((i) => i.variantId !== variantId);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): Cents {
  return addCents(...items.map((i) => multiplyCents(i.priceCents, i.quantity)));
}
