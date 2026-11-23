"use client";

import { useCallback, useSyncExternalStore } from "react";
import { addItem, removeItem, sanitizeCart, setQuantity, type CartItem } from "./cart";

/**
 * Carrinho persistido no localStorage (sobrevive à navegação e ao recarregar),
 * sincronizado entre abas. Os preços aqui são apenas para exibição.
 */
const KEY = "amora-fit:cart:v1";
const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let snapshot: CartItem[] | null = null;

function read(): CartItem[] {
  if (snapshot) return snapshot;
  try {
    snapshot = sanitizeCart(JSON.parse(window.localStorage.getItem(KEY) ?? "[]"));
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(items: CartItem[]) {
  snapshot = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // modo privado / cota cheia: segue só em memória
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  return {
    items,
    add: useCallback(
      (item: Omit<CartItem, "quantity">, quantity: number, maxAvailable?: number) =>
        write(addItem(read(), item, quantity, maxAvailable)),
      [],
    ),
    setQuantity: useCallback((variantId: string, q: number) => write(setQuantity(read(), variantId, q)), []),
    remove: useCallback((variantId: string) => write(removeItem(read(), variantId)), []),
    clear: useCallback(() => write([]), []),
  };
}
