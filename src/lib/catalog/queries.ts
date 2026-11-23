import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { publicEnv } from "@/lib/env";
import { getSupabasePublicClient } from "@/lib/supabase/server";
import { normalizeProduct, storagePublicUrl, type RawProduct } from "./normalize";
import type { CatalogProduct, Category, StoreSettings } from "./types";

/**
 * Leituras públicas do catálogo, com cache do Next ("use cache").
 * Usam o cliente anônimo (sem cookies), então RLS só devolve o que é público.
 * Quando o admin alterar produtos/configurações, as actions chamam
 * updateTag(CATALOG_TAG) / updateTag(SETTINGS_TAG) para atualizar na hora.
 *
 * Estratégia: o catálogo inteiro é carregado e filtrado em memória. Para uma loja
 * com centenas de produtos isso é rápido e barato (1 consulta em cache). Se o
 * catálogo crescer para milhares de itens, migrar os filtros para o SQL.
 */
export const CATALOG_TAG = "catalog";
export const SETTINGS_TAG = "store-settings";

const PRODUCT_SELECT = `
  id, slug, name, description, price_cents, promo_price_cents, is_new, is_featured, created_at,
  category:categories(slug, name),
  images:product_images(storage_path, alt_text, position),
  variants:product_variants(id, color_name, color_hex, size, position, inventory(available))
`;

export async function getCatalog(): Promise<CatalogProduct[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const { data, error } = await getSupabasePublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Falha ao carregar catálogo: ${error.message}`);

  return (data as unknown as RawProduct[]).map((p) => normalizeProduct(p, publicEnv.supabaseUrl));
}

export async function getProductBySlug(slug: string): Promise<CatalogProduct | null> {
  const catalog = await getCatalog();
  return catalog.find((p) => p.slug === slug) ?? null;
}

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  // select("*"): funciona antes e depois da migration 0009 (coluna image_path).
  const { data, error } = await getSupabasePublicClient()
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("position");
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
  return ((data ?? []) as { id: string; slug: string; name: string; image_path?: string | null }[]).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    imageUrl: c.image_path ? storagePublicUrl(publicEnv.supabaseUrl, "store-assets", c.image_path) : null,
  }));
}

export async function getBestSellerIds(limit = 8): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);

  const { data, error } = await getSupabasePublicClient().rpc("catalog_best_sellers", { p_limit: limit });
  if (error) {
    // Vitrine continua funcionando sem a seção (ex.: migration 0008 ainda não aplicada).
    console.warn(`[catalog] mais vendidos indisponível: ${error.message}`);
    return [];
  }
  return (data as string[] | null) ?? [];
}

type RawSettings = {
  store_name: string;
  tagline: string;
  whatsapp_phone: string;
  contact_email: string | null;
  contact_phone: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  banner_active: boolean;
  banner_title: string;
  banner_text: string;
  banner_image_path: string | null;
  logo_path: string | null;
  about_text: string;
  shipping_policy_text: string;
  whatsapp_order_greeting: string;
  whatsapp_order_closing: string;
};

export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag(SETTINGS_TAG);

  const { data, error } = await getSupabasePublicClient()
    .from("store_settings")
    .select(
      "store_name, tagline, whatsapp_phone, contact_email, contact_phone, instagram_url, tiktok_url, banner_active, banner_title, banner_text, banner_image_path, logo_path, about_text, shipping_policy_text, whatsapp_order_greeting, whatsapp_order_closing",
    )
    .eq("id", 1)
    .single<RawSettings>();
  if (error) throw new Error(`Falha ao carregar configurações da loja: ${error.message}`);

  const asset = (path: string | null) =>
    path ? storagePublicUrl(publicEnv.supabaseUrl, "store-assets", path) : null;

  return {
    storeName: data.store_name,
    tagline: data.tagline,
    whatsappPhone: data.whatsapp_phone,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    instagramUrl: data.instagram_url,
    tiktokUrl: data.tiktok_url,
    bannerActive: data.banner_active,
    bannerTitle: data.banner_title,
    bannerText: data.banner_text,
    bannerImageUrl: asset(data.banner_image_path),
    logoUrl: asset(data.logo_path),
    aboutText: data.about_text,
    shippingPolicyText: data.shipping_policy_text,
    whatsappOrderGreeting: data.whatsapp_order_greeting,
    whatsappOrderClosing: data.whatsapp_order_closing,
  };
}
