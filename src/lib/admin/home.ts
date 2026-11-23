import "server-only";

import { requireAdmin } from "@/lib/auth/dal";
import { storagePublicUrl } from "@/lib/catalog/normalize";
import { publicEnv } from "@/lib/env";
import { PRODUCT_SOURCES, sectionSchema, type HomeSection, type SectionType } from "@/lib/home/sections";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const assetUrl = (path: string | null | undefined) => (path ? storagePublicUrl(publicEnv.supabaseUrl, "store-assets", path) : null);

export type AdminSectionRow = {
  id: string;
  type: SectionType;
  title: string;
  position: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string;
  valid: boolean;
  summary: string;
  thumb: string | null;
};

/** null = tabela ainda não existe (migration 0012 pendente). */
export async function listAdminSections(): Promise<AdminSectionRow[] | null> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("home_sections").select("*").order("position");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`Falha ao carregar seções: ${error.message}`);
  }
  return (data ?? []).map((row) => {
    const parsed = sectionSchema.safeParse(row);
    let summary = "";
    let thumb: string | null = null;
    if (parsed.success) {
      const s = parsed.data;
      if (s.type === "banners") {
        summary = `${s.config.slides.length} slide(s)${s.config.autoplay_seconds ? ` · troca a cada ${s.config.autoplay_seconds}s` : ""}`;
        thumb = assetUrl(s.config.slides[0]?.image_path);
      } else if (s.type === "products") summary = `${PRODUCT_SOURCES[s.config.source]} · até ${s.config.limit} produtos`;
      else if (s.type === "double_banner") thumb = assetUrl(s.config.items[0]?.image_path);
      else if (s.type === "text") summary = s.config.body.slice(0, 80);
    }
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      position: row.position,
      is_active: row.is_active,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      updated_at: row.updated_at,
      valid: parsed.success,
      summary,
      thumb,
    };
  });
}

export async function getAdminSection(id: string): Promise<HomeSection | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("home_sections").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const parsed = sectionSchema.safeParse(data);
  return parsed.success ? { ...parsed.data, id: data.id, position: data.position } : null;
}

export type AdminCategory = { id: string; slug: string; name: string; position: number; is_active: boolean; image_path: string | null; image_url: string | null; products: number };

export async function listAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("*, products(count)").order("position");
  if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`);
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    position: c.position,
    is_active: c.is_active,
    image_path: c.image_path ?? null,
    image_url: assetUrl(c.image_path),
    products: (c.products as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

export async function listProductsForPicker() {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase.from("products").select("id, name, status, images:product_images(*)").neq("status", "archived").order("name").limit(500);
  return (data ?? []).map((p) => {
    const first = ((p.images ?? []) as { storage_path: string; position: number }[]).sort((a, b) => a.position - b.position)[0];
    return { id: p.id, name: p.name, status: p.status as string, thumb: first ? storagePublicUrl(publicEnv.supabaseUrl, "product-images", first.storage_path) : null };
  });
}
