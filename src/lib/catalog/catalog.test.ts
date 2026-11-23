import { describe, expect, it } from "vitest";
import { addItem, cartCount, cartSubtotal, removeItem, sanitizeCart, setQuantity, type CartItem } from "@/lib/cart/cart";
import { filterOptions, filterProducts, parseFilters, relatedProducts } from "./filters";
import { normalizeProduct, type RawProduct } from "./normalize";

const SB = "https://x.supabase.co";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function raw(over: Partial<RawProduct> & { slug: string }): RawProduct {
  return {
    id: over.slug,
    name: over.slug,
    description: "",
    price_cents: 8990,
    promo_price_cents: null,
    is_new: false,
    is_featured: false,
    created_at: "2026-11-01T00:00:00Z",
    category: { slug: "leggings", name: "Leggings" },
    images: [],
    variants: [],
    ...over,
  };
}

const legging = normalizeProduct(
  raw({
    slug: "legging",
    name: "Legging Cintura Alta",
    is_featured: true,
    images: [
      { storage_path: "b/2.jpg", alt_text: "", position: 2 },
      { storage_path: "a/1 foto.jpg", alt_text: "Frente", position: 1 },
    ],
    variants: [
      { id: "v3", color_name: "Vinho", color_hex: "#6B1544", size: "G", position: 3, inventory: { available: 0 } },
      { id: "v1", color_name: "Preto", color_hex: "#0A0A0A", size: "P", position: 1, inventory: [{ available: 4 }] },
      { id: "v2", color_name: "Preto", color_hex: "#0A0A0A", size: "M", position: 2, inventory: null },
    ],
  }),
  SB,
);
const top = normalizeProduct(
  raw({
    slug: "top",
    name: "Top Nadador",
    price_cents: 5990,
    promo_price_cents: 3990,
    is_new: true,
    created_at: "2026-11-10T00:00:00Z",
    category: { slug: "tops", name: "Tops" },
    variants: [{ id: "t1", color_name: "Rosa Seco", color_hex: "#C98F9B", size: "M", position: 1, inventory: { available: 2 } }],
  }),
  SB,
);
const esgotado = normalizeProduct(
  raw({
    slug: "esgotado",
    name: "Short Esgotado",
    category: { slug: "shorts", name: "Shorts" },
    variants: [{ id: "s1", color_name: "Preto", color_hex: "#0A0A0A", size: "P", position: 1, inventory: { available: 0 } }],
  }),
  SB,
);
const all = [esgotado, top, legging];

describe("normalizeProduct", () => {
  it("ordena variações/imagens, agrega cores e calcula disponibilidade", () => {
    expect(legging.images.map((i) => i.url)).toEqual([
      `${SB}/storage/v1/object/public/product-images/a/1%20foto.jpg`,
      `${SB}/storage/v1/object/public/product-images/b/2.jpg`,
    ]);
    expect(legging.images[1].alt).toBe("Legging Cintura Alta");
    expect(legging.sizes).toEqual(["P", "M", "G"]);
    expect(legging.colors).toEqual([
      { name: "Preto", hex: "#0A0A0A", available: 4 },
      { name: "Vinho", hex: "#6B1544", available: 0 },
    ]);
    expect(legging.totalAvailable).toBe(4);
    expect(top.effectivePriceCents).toBe(3990);
  });
});

describe("filtros", () => {
  it("lê a query string com segurança", () => {
    const f = parseFilters({ categoria: "tops", tamanho: ["P", "M,G"], cor: "Preto", min: "50", max: "abc", ordem: "x", q: "  top " });
    expect(f).toMatchObject({ category: "tops", sizes: ["P", "M", "G"], colors: ["Preto"], minCents: 5000, maxCents: undefined, sort: "relevancia", q: "top" });
    expect(parseFilters({ categoria: "../etc" }).category).toBeUndefined();
  });

  it("busca sem acento e por cor", () => {
    expect(filterProducts(all, parseFilters({ q: "nadadór" })).map((p) => p.slug)).toEqual(["top"]);
    expect(filterProducts(all, parseFilters({ q: "rosa" })).map((p) => p.slug)).toEqual(["top"]);
  });

  it("tamanho + cor precisam existir na MESMA variação", () => {
    // Legging tem Preto/P e Vinho/G, mas não Vinho/P
    expect(filterProducts(all, parseFilters({ tamanho: "P", cor: "Vinho" }))).toHaveLength(0);
    expect(filterProducts(all, parseFilters({ tamanho: "G", cor: "vinho" })).map((p) => p.slug)).toEqual(["legging"]);
  });

  it("faixa de preço usa o preço promocional", () => {
    expect(filterProducts(all, parseFilters({ max: "40" })).map((p) => p.slug)).toEqual(["top"]);
  });

  it("disponíveis primeiro e ordenação por preço", () => {
    expect(filterProducts(all, parseFilters({ ordem: "menor-preco" })).map((p) => p.slug)).toEqual(["top", "legging", "esgotado"]);
    expect(filterProducts(all, parseFilters({ disponivel: "1" })).map((p) => p.slug)).not.toContain("esgotado");
  });

  it("opções e relacionados", () => {
    const o = filterOptions(all);
    expect(o.sizes.sort()).toEqual(["G", "M", "P"]);
    expect(o.minReais).toBe(39);
    expect(o.maxReais).toBe(90);
    expect(relatedProducts(all, legging).map((p) => p.slug)).toEqual(["top", "esgotado"]);
  });
});

describe("carrinho", () => {
  const base = { productId: "p", slug: "s", name: "Legging", colorName: "Preto", size: "M", priceCents: 8990, imageUrl: null };

  it("combina mesma variação e respeita o estoque disponível", () => {
    let c: CartItem[] = [];
    c = addItem(c, { ...base, variantId: uuid(1) }, 2, 3);
    c = addItem(c, { ...base, variantId: uuid(1) }, 5, 3);
    c = addItem(c, { ...base, variantId: uuid(2), size: "G" }, 1);
    expect(c.map((i) => i.quantity)).toEqual([3, 1]);
    expect(cartCount(c)).toBe(4);
    expect(cartSubtotal(c)).toBe(35960);
    c = setQuantity(c, uuid(2), 0);
    expect(c).toHaveLength(1);
    expect(removeItem(c, uuid(1))).toEqual([]);
  });

  it("não adiciona item sem estoque", () => {
    expect(addItem([], { ...base, variantId: uuid(1) }, 1, 0)).toEqual([]);
  });

  it("sanitiza dados adulterados do localStorage", () => {
    const dirty = [
      { ...base, variantId: uuid(1), quantity: 2 },
      { ...base, variantId: uuid(1), quantity: 9 }, // duplicado
      { ...base, variantId: "x", quantity: 1 },
      { ...base, variantId: uuid(3), quantity: 1.5 },
      { ...base, variantId: uuid(4), priceCents: -1, quantity: 1 },
      { ...base, variantId: uuid(5), quantity: 5000 },
      "lixo",
    ];
    const clean = sanitizeCart(dirty);
    expect(clean.map((i) => [i.variantId, i.quantity])).toEqual([
      [uuid(1), 2],
      [uuid(5), 99],
    ]);
    expect(sanitizeCart("nada")).toEqual([]);
  });
});
