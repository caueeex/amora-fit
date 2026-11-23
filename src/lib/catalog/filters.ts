import type { CatalogProduct } from "./types";

export type SortKey = "relevancia" | "novidades" | "menor-preco" | "maior-preco";

export type CatalogFilters = {
  q?: string;
  category?: string;
  sizes: string[];
  colors: string[];
  minCents?: number;
  maxCents?: number;
  onlyAvailable: boolean;
  sort: SortKey;
};

const SORTS: SortKey[] = ["relevancia", "novidades", "menor-preco", "maior-preco"];

export function foldText(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

function list(v: string | string[] | undefined): string[] {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(arr.flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean))].slice(0, 20);
}

function reais(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s || !/^\d{1,6}$/.test(s)) return undefined;
  return Number(s) * 100;
}

/** Converte a query string (?categoria=...&tamanho=P&cor=Preto&min=50&max=150&ordem=...) em filtros. */
export function parseFilters(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 80) || undefined;
  const category = (Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria) || undefined;
  const sortRaw = Array.isArray(sp.ordem) ? sp.ordem[0] : sp.ordem;
  return {
    q,
    category: category && /^[a-z0-9-]{1,60}$/.test(category) ? category : undefined,
    sizes: list(sp.tamanho),
    colors: list(sp.cor),
    minCents: reais(sp.min),
    maxCents: reais(sp.max),
    onlyAvailable: (Array.isArray(sp.disponivel) ? sp.disponivel[0] : sp.disponivel) === "1",
    sort: SORTS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : "relevancia",
  };
}

export function filterProducts(products: CatalogProduct[], f: CatalogFilters): CatalogProduct[] {
  const terms = f.q ? foldText(f.q).split(/\s+/).filter(Boolean) : [];
  const sizeSet = new Set(f.sizes);
  const colorSet = new Set(f.colors.map(foldText));

  const result = products.filter((p) => {
    if (f.category && p.categorySlug !== f.category) return false;
    if (f.minCents !== undefined && p.effectivePriceCents < f.minCents) return false;
    if (f.maxCents !== undefined && p.effectivePriceCents > f.maxCents) return false;
    if (terms.length) {
      const hay = foldText(`${p.name} ${p.description} ${p.categoryName ?? ""} ${p.colors.map((c) => c.name).join(" ")}`);
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    if (sizeSet.size || colorSet.size || f.onlyAvailable) {
      // Precisa existir UMA variação que satisfaça tamanho + cor (+ disponível) ao mesmo tempo.
      const ok = p.variants.some(
        (v) =>
          (!sizeSet.size || sizeSet.has(v.size)) &&
          (!colorSet.size || colorSet.has(foldText(v.colorName))) &&
          (!f.onlyAvailable || v.available > 0),
      );
      if (!ok) return false;
    }
    return true;
  });

  const byAvailability = (a: CatalogProduct, b: CatalogProduct) =>
    Number(b.totalAvailable > 0) - Number(a.totalAvailable > 0);

  switch (f.sort) {
    case "menor-preco":
      return result.sort((a, b) => byAvailability(a, b) || a.effectivePriceCents - b.effectivePriceCents);
    case "maior-preco":
      return result.sort((a, b) => byAvailability(a, b) || b.effectivePriceCents - a.effectivePriceCents);
    case "novidades":
      return result.sort((a, b) => byAvailability(a, b) || b.createdAt.localeCompare(a.createdAt));
    default:
      return result.sort(
        (a, b) =>
          byAvailability(a, b) ||
          Number(b.isFeatured) - Number(a.isFeatured) ||
          Number(b.isNew) - Number(a.isNew) ||
          b.createdAt.localeCompare(a.createdAt),
      );
  }
}

/** Opções de filtro presentes no catálogo (para montar os chips). */
export function filterOptions(products: CatalogProduct[]) {
  const sizes = new Set<string>();
  const colors = new Map<string, string>();
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    p.sizes.forEach((s) => sizes.add(s));
    p.colors.forEach((c) => colors.set(c.name, c.hex));
    min = Math.min(min, p.effectivePriceCents);
    max = Math.max(max, p.effectivePriceCents);
  }
  return {
    sizes: [...sizes],
    colors: [...colors].map(([name, hex]) => ({ name, hex })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    minReais: Number.isFinite(min) ? Math.floor(min / 100) : 0,
    maxReais: Math.ceil(max / 100),
  };
}

/** Relacionados: mesma categoria primeiro, depois os demais; disponíveis antes. */
export function relatedProducts(all: CatalogProduct[], product: CatalogProduct, limit = 4): CatalogProduct[] {
  const others = all.filter((p) => p.id !== product.id);
  const score = (p: CatalogProduct) =>
    (p.categorySlug === product.categorySlug ? 4 : 0) + (p.totalAvailable > 0 ? 2 : 0) + (p.isFeatured ? 1 : 0);
  return others.sort((a, b) => score(b) - score(a) || b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}
