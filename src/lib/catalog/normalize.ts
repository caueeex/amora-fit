import { SIZE_ORDER, type CatalogColor, type CatalogProduct, type CatalogVariant } from "./types";

type RawInventory = { available: number } | { available: number }[] | null;

/** Linha crua devolvida pelo PostgREST (ver PRODUCT_SELECT em queries.ts). */
export type RawProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number;
  promo_price_cents: number | null;
  is_new: boolean;
  is_featured: boolean;
  created_at: string;
  category: { slug: string; name: string } | null;
  images: { storage_path: string; alt_text: string; position: number }[] | null;
  variants:
    | {
        id: string;
        color_name: string;
        color_hex: string;
        size: string;
        position: number;
        // 1:1 — o PostgREST pode devolver objeto ou lista, dependendo da versão.
        inventory: RawInventory;
      }[]
    | null;
};

export function sizeRank(size: string): number {
  const i = SIZE_ORDER.indexOf(size as (typeof SIZE_ORDER)[number]);
  return i === -1 ? SIZE_ORDER.length : i;
}

export function storagePublicUrl(supabaseUrl: string, bucket: string, path: string): string {
  const clean = path.replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${clean}`;
}

function availableOf(inv: RawInventory): number {
  const row = Array.isArray(inv) ? inv[0] : inv;
  return Math.max(0, row?.available ?? 0);
}

export function normalizeProduct(raw: RawProduct, supabaseUrl: string): CatalogProduct {
  const variants: CatalogVariant[] = (raw.variants ?? [])
    .slice()
    .sort((a, b) => a.position - b.position || sizeRank(a.size) - sizeRank(b.size))
    .map((v) => ({
      id: v.id,
      colorName: v.color_name,
      colorHex: v.color_hex,
      size: v.size,
      available: availableOf(v.inventory),
    }));

  const colorMap = new Map<string, CatalogColor>();
  for (const v of variants) {
    const c = colorMap.get(v.colorName) ?? { name: v.colorName, hex: v.colorHex, available: 0 };
    c.available += v.available;
    colorMap.set(v.colorName, c);
  }

  const sizes = [...new Set(variants.map((v) => v.size))].sort((a, b) => sizeRank(a) - sizeRank(b));

  const images = (raw.images ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => ({
      url: storagePublicUrl(supabaseUrl, "product-images", img.storage_path),
      alt: img.alt_text || raw.name,
    }));

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    categorySlug: raw.category?.slug ?? null,
    categoryName: raw.category?.name ?? null,
    priceCents: raw.price_cents,
    promoPriceCents: raw.promo_price_cents,
    effectivePriceCents: raw.promo_price_cents ?? raw.price_cents,
    isNew: raw.is_new,
    isFeatured: raw.is_featured,
    createdAt: raw.created_at,
    images,
    variants,
    colors: [...colorMap.values()],
    sizes,
    totalAvailable: variants.reduce((sum, v) => sum + v.available, 0),
  };
}
