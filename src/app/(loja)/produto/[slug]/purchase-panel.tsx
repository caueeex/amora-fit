"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Price } from "@/components/loja/price";
import { Button, buttonClasses } from "@/components/ui/button";
import type { CatalogProduct } from "@/lib/catalog/types";
import { useCart } from "@/lib/cart/store";
import { useProductColor } from "./product-color";

export function PurchasePanel({ product }: { product: CatalogProduct }) {
  const { items, add } = useCart();
  const { color, setColor } = useProductColor();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variantsOfColor = useMemo(() => product.variants.filter((v) => v.colorName === color), [product.variants, color]);
  const variant = size ? variantsOfColor.find((v) => v.size === size) : undefined;
  const inCart = variant ? items.find((i) => i.variantId === variant.id)?.quantity ?? 0 : 0;
  const maxQty = variant ? Math.max(0, variant.available - inCart) : 0;
  const soldOut = product.totalAvailable === 0;

  function chooseColor(name: string) {
    setColor(name);
    setAdded(false);
    setError(null);
    // mantém o tamanho se existir disponível na nova cor
    if (size && !product.variants.some((v) => v.colorName === name && v.size === size && v.available > 0)) setSize(null);
    setQty(1);
  }

  function handleAdd() {
    setAdded(false);
    if (!size || !variant) {
      setError("Escolha um tamanho.");
      return;
    }
    if (maxQty < 1) {
      setError(inCart > 0 ? "Você já tem todas as unidades disponíveis no carrinho." : "Esta combinação está esgotada.");
      return;
    }
    add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        colorName: variant.colorName,
        size: variant.size,
        priceCents: product.effectivePriceCents,
        imageUrl: product.images[0]?.url ?? null,
      },
      Math.min(qty, maxQty),
      variant.available,
    );
    setError(null);
    setAdded(true);
    setQty(1);
  }

  const availabilityText = !size
    ? null
    : !variant || variant.available === 0
      ? "Esgotado nesta cor e tamanho"
      : variant.available <= 3
        ? `Últimas ${variant.available} ${variant.available === 1 ? "unidade" : "unidades"}`
        : "Em estoque";

  return (
    <div className="flex flex-col gap-5">
      <Price priceCents={product.priceCents} promoPriceCents={product.promoPriceCents} size="lg" />

      {/* Cor */}
      <fieldset>
        <legend className="mb-2 text-sm text-creme-100/80">
          Cor: <strong className="text-creme-50">{color}</strong>
        </legend>
        <div className="flex flex-wrap gap-3">
          {product.colors.map((c) => {
            const selected = c.name === color;
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => chooseColor(c.name)}
                aria-pressed={selected}
                aria-label={`${c.name}${c.available === 0 ? " (esgotada)" : ""}`}
                title={c.name}
                className={`relative h-11 w-11 rounded-full border-2 transition-[transform,border-color] duration-200 hover:scale-105 ${
                  selected ? "border-creme-300" : "border-creme-300/20"
                } ${c.available === 0 ? "opacity-40" : ""}`}
              >
                <span className="absolute inset-1 rounded-full" style={{ backgroundColor: c.hex }} />
                {c.available === 0 && (
                  <span className="absolute left-1/2 top-1/2 h-0.5 w-9 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-creme-100/80" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Tamanho */}
      <fieldset>
        <legend className="mb-2 text-sm text-creme-100/80">
          Tamanho{size ? ": " : ""}
          {size && <strong className="text-creme-50">{size}</strong>}
        </legend>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map((s) => {
            const v = variantsOfColor.find((x) => x.size === s);
            const disabled = !v || v.available === 0;
            const selected = s === size;
            return (
              <button
                key={s}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSize(s);
                  setQty(1);
                  setAdded(false);
                  setError(null);
                }}
                aria-pressed={selected}
                aria-label={`Tamanho ${s}${disabled ? " (esgotado)" : ""}`}
                className={`h-11 min-w-12 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  selected
                    ? "border-creme-300 bg-creme-300 text-amora-900"
                    : "border-creme-300/25 text-creme-100 hover:border-creme-300/70"
                } disabled:cursor-not-allowed disabled:border-creme-300/10 disabled:text-creme-100/30 disabled:line-through`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {availabilityText && (
          <p className={`mt-2 text-sm ${variant && variant.available > 0 ? "text-creme-300" : "text-amora-300"}`} aria-live="polite">
            {availabilityText}
          </p>
        )}
      </fieldset>

      {/* Quantidade + adicionar */}
      {soldOut ? (
        <div className="rounded-xl border border-creme-300/20 bg-amora-950/40 p-4 text-sm text-creme-100/85">
          Produto esgotado no momento.
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex h-12 items-center justify-between rounded-full border border-creme-300/25 sm:w-36" role="group" aria-label="Quantidade">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="grid h-12 w-12 place-items-center rounded-full text-xl text-creme-100 hover:bg-creme-300/10 disabled:opacity-30"
              aria-label="Diminuir quantidade"
            >
              −
            </button>
            <span className="min-w-6 text-center font-semibold text-creme-50" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(Math.max(maxQty, 1), q + 1, 99))}
              disabled={!!variant && qty >= maxQty}
              className="grid h-12 w-12 place-items-center rounded-full text-xl text-creme-100 hover:bg-creme-300/10 disabled:opacity-30"
              aria-label="Aumentar quantidade"
            >
              +
            </button>
          </div>
          <Button type="button" size="lg" className="flex-1" onClick={handleAdd}>
            Adicionar ao carrinho
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm font-medium text-amora-300" role="alert">
          {error}
        </p>
      )}
      {added && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-creme-300/40 bg-creme-300/10 px-4 py-3 animate-[subir_300ms_var(--ease-suave)]" role="status">
          <span className="text-sm text-creme-50">Adicionado ao carrinho 💜</span>
          <Link href="/carrinho" className={buttonClasses({ size: "md" })}>
            Ver carrinho
          </Link>
        </div>
      )}

      <p className="text-xs leading-relaxed text-creme-100/60">
        Frete e pagamento são combinados pelo WhatsApp após o pedido. Preço e estoque são confirmados na finalização.
      </p>
    </div>
  );
}
