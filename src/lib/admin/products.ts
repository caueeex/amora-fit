import "server-only";

import { requireAdmin } from "@/lib/auth/dal";
import { sizeRank, storagePublicUrl } from "@/lib/catalog/normalize";
import { publicEnv } from "@/lib/env";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import type { ProductStatus } from "./product-status";

export type { ProductStatus };

export type AdminProductRow = {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  price_cents: number;
  promo_price_cents: number | null;
  is_new: boolean;
  is_featured: boolean;
  category: string | null;
  thumb: string | null;
  variants: number;
  available: number;
  updated_at: string;
};

const safe = (q: string) => q.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
const imgUrl = (path: string) => storagePublicUrl(publicEnv.supabaseUrl, "product-images", path);

export async function listAdminProducts(f: { q?: string; status?: string; category?: string }): Promise<AdminProductRow[]> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("products")
    .select("id, name, slug, status, price_cents, promo_price_cents, is_new, is_featured, updated_at, category:categories(name, slug), images:product_images(*), variants:product_variants(is_active, inventory(available))")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (f.status && ["draft", "active", "archived"].includes(f.status)) query = query.eq("status", f.status);
  if (f.q?.trim()) query = query.ilike("name", `%${safe(f.q)}%`);
  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar produtos: ${error.message}`);

  type Raw = {
    id: string; name: string; slug: string; status: ProductStatus; price_cents: number; promo_price_cents: number | null;
    is_new: boolean; is_featured: boolean; updated_at: string;
    category: { name: string; slug: string } | null;
    images: { storage_path: string; position: number }[];
    variants: { is_active: boolean; inventory: { available: number } | { available: number }[] | null }[];
  };
  return (data as unknown as Raw[])
    .filter((p) => !f.category || p.category?.slug === f.category)
    .map((p) => {
      const first = [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0];
      const active = (p.variants ?? []).filter((v) => v.is_active);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        price_cents: p.price_cents,
        promo_price_cents: p.promo_price_cents,
        is_new: p.is_new,
        is_featured: p.is_featured,
        category: p.category?.name ?? null,
        thumb: first ? imgUrl(first.storage_path) : null,
        variants: active.length,
        available: active.reduce((n, v) => n + Math.max(0, (Array.isArray(v.inventory) ? v.inventory[0] : v.inventory)?.available ?? 0), 0),
        updated_at: p.updated_at,
      };
    });
}

export type AdminVariant = {
  id: string;
  color_name: string;
  color_hex: string;
  size: string;
  sku: string | null;
  is_active: boolean;
  position: number;
  on_hand: number;
  reserved: number;
  available: number;
};

export type AdminImage = { id: string; storage_path: string; url: string; alt_text: string; color_name: string | null; position: number };

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string | null;
  price_cents: number;
  promo_price_cents: number | null;
  status: ProductStatus;
  is_new: boolean;
  is_featured: boolean;
  variants: AdminVariant[];
  images: AdminImage[];
  has_orders: boolean;
};

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, description, category_id, price_cents, promo_price_cents, status, is_new, is_featured, images:product_images(*), variants:product_variants(id, color_name, color_hex, size, sku, is_active, position, inventory(on_hand, reserved, available))")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id),
  ]);
  if (error) throw new Error(`Falha ao carregar produto: ${error.message}`);
  if (!data) return null;

  type RawV = Omit<AdminVariant, "on_hand" | "reserved" | "available"> & {
    inventory: { on_hand: number; reserved: number; available: number } | { on_hand: number; reserved: number; available: number }[] | null;
  };
  const variants = ((data.variants ?? []) as RawV[])
    .map(({ inventory, ...v }) => {
      const inv = Array.isArray(inventory) ? inventory[0] : inventory;
      return { ...v, on_hand: inv?.on_hand ?? 0, reserved: inv?.reserved ?? 0, available: inv?.available ?? 0 };
    })
    .sort((a, b) => a.position - b.position || sizeRank(a.size) - sizeRank(b.size));

  const images = ((data.images ?? []) as { id: string; storage_path: string; alt_text: string; color_name?: string | null; position: number }[])
    .map((i) => ({ id: i.id, storage_path: i.storage_path, url: imgUrl(i.storage_path), alt_text: i.alt_text, color_name: i.color_name ?? null, position: i.position }))
    .sort((a, b) => a.position - b.position);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    category_id: data.category_id,
    price_cents: data.price_cents,
    promo_price_cents: data.promo_price_cents,
    status: data.status as ProductStatus,
    is_new: data.is_new,
    is_featured: data.is_featured,
    variants,
    images,
    has_orders: (count ?? 0) > 0,
  };
}

export async function listCategoriesForAdmin() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("categories").select("id, name, slug").order("position");
  return data ?? [];
}
