import { filterProducts, foldText, parseFilters } from "./filters";
import type { CatalogProduct, Category } from "./types";

export type SearchSuggestion = { label: string; href: string };
export type SearchProduct = {
  slug: string;
  name: string;
  priceCents: number;
  promoPriceCents: number | null;
  imageUrl: string | null;
  soldOut: boolean;
};
export type SearchResult = { query: string; suggestions: SearchSuggestion[]; products: SearchProduct[]; total: number };

const capitalize = (s: string) => s.replace(/^\p{L}/u, (c) => c.toUpperCase());

/** Termos que "completam" a busca, montados a partir do próprio catálogo (categorias, cores, peças). */
export function suggestSearch(catalog: CatalogProduct[], categories: Category[], rawQuery: string, limits = { suggestions: 7, products: 4 }): SearchResult {
  const query = rawQuery.trim().slice(0, 80);
  const terms = foldText(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return { query, suggestions: [], products: [], total: 0 };

  const matches = (text: string) => {
    const hay = foldText(text);
    return terms.every((t) => hay.split(/\s+/).some((w) => w.startsWith(t)) || hay.includes(t));
  };

  const candidates = new Map<string, SearchSuggestion & { rank: number }>();
  const add = (label: string, href: string, rank: number) => {
    const key = foldText(label);
    if (!matches(label) || key === foldText(query)) return;
    const prev = candidates.get(key);
    if (!prev || prev.rank > rank) candidates.set(key, { label, href, rank });
  };

  for (const c of categories) {
    add(c.name, `/produtos?categoria=${c.slug}`, 0);
  }
  for (const p of catalog) {
    const category = categories.find((c) => c.slug === p.categorySlug);
    const singular = category ? category.name.replace(/s$/i, "") : null;
    for (const color of p.colors) {
      if (singular) add(capitalize(`${singular} ${color.name.toLowerCase()}`), `/produtos?categoria=${category!.slug}&cor=${encodeURIComponent(color.name)}`, 1);
      add(color.name, `/produtos?cor=${encodeURIComponent(color.name)}`, 2);
    }
    add(p.name, `/produto/${p.slug}`, 3);
  }

  // Preferir sugestões que começam com o termo digitado.
  const startsWith = (label: string) => foldText(label).startsWith(terms[0]);
  const suggestions = [...candidates.values()]
    .sort((a, b) => Number(startsWith(b.label)) - Number(startsWith(a.label)) || a.rank - b.rank || a.label.length - b.label.length || a.label.localeCompare(b.label, "pt-BR"))
    .slice(0, limits.suggestions)
    .map(({ label, href }) => ({ label, href }));

  const found = filterProducts(catalog, parseFilters({ q: query }));
  const products = found.slice(0, limits.products).map((p) => ({
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    promoPriceCents: p.promoPriceCents,
    imageUrl: p.images[0]?.url ?? null,
    soldOut: p.totalAvailable === 0,
  }));

  return { query, suggestions, products, total: found.length };
}

/**
 * Divide o rótulo em [antes, digitado, depois] para destacar a parte que COMPLETA a busca.
 * Comparação sem acentos; cai para "sem destaque" se não achar.
 */
export function splitHighlight(label: string, query: string): [string, string, string] {
  const q = foldText(query);
  const folded = label.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const i = q ? folded.indexOf(q) : -1;
  if (i < 0 || folded.length !== label.length) return ["", "", label];
  return [label.slice(0, i), label.slice(i, i + q.length), label.slice(i + q.length)];
}
