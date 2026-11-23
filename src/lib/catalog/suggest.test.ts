import { describe, expect, it } from "vitest";
import { normalizeProduct, type RawProduct } from "./normalize";
import { splitHighlight, suggestSearch } from "./suggest";
import type { Category } from "./types";

const cats: Category[] = [
  { id: "1", slug: "tops", name: "Tops", imageUrl: null },
  { id: "2", slug: "leggings", name: "Leggings", imageUrl: null },
];

function product(slug: string, name: string, category: string, colors: [string, string][], promo: number | null = null): RawProduct {
  return {
    id: slug,
    slug,
    name,
    description: "",
    price_cents: 8990,
    promo_price_cents: promo,
    is_new: false,
    is_featured: false,
    created_at: "2026-11-01T00:00:00Z",
    category: { slug: category, name: cats.find((c) => c.slug === category)!.name },
    images: [],
    variants: colors.map(([n, hex], i) => ({ id: `${slug}-${i}`, color_name: n, color_hex: hex, size: "M", position: i, inventory: { available: 2 } })),
  };
}

const catalog = [
  product("legging-cintura-alta", "Legging Cintura Alta", "leggings", [["Preto", "#000000"], ["Vinho", "#6B1544"]]),
  product("top-alca", "Top Alça Cruzada", "tops", [["Preto", "#000000"]], 4990),
].map((p) => normalizeProduct(p, "https://x.supabase.co"));

describe("suggestSearch", () => {
  it("sugere categoria, combinações categoria+cor e produtos", () => {
    const r = suggestSearch(catalog, cats, "leg");
    expect(r.suggestions.map((s) => s.label)).toEqual(["Leggings", "Legging preto", "Legging vinho", "Legging Cintura Alta"]);
    expect(r.suggestions[1].href).toBe("/produtos?categoria=leggings&cor=Preto");
    expect(r.products.map((p) => p.slug)).toEqual(["legging-cintura-alta"]);
    expect(r.total).toBe(1);
  });

  it("ignora acentos e aceita vários termos", () => {
    expect(suggestSearch(catalog, cats, "alca").products.map((p) => p.slug)).toEqual(["top-alca"]);
    expect(suggestSearch(catalog, cats, "top pre").suggestions.map((s) => s.label)).toContain("Top preto");
  });

  it("busca vazia não retorna nada", () => {
    expect(suggestSearch(catalog, cats, "   ")).toEqual({ query: "", suggestions: [], products: [], total: 0 });
  });

  it("destaca a parte digitada", () => {
    expect(splitHighlight("Legging preto", "leg")).toEqual(["", "Leg", "ging preto"]);
    expect(splitHighlight("Top Alça Cruzada", "alca")).toEqual(["Top ", "Alça", " Cruzada"]);
    expect(splitHighlight("Shorts", "xyz")).toEqual(["", "", "Shorts"]);
  });
});
