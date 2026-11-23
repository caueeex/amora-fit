"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { CATALOG_TAG, HOME_TAG } from "@/lib/catalog/queries";
import { sectionSchema, SECTION_TYPES, type SectionType } from "@/lib/home/sections";
import { slugify } from "@/lib/slug";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Result = { ok: true; id?: string } | { ok: false; error: string };
const id = z.uuid();

/** Caminhos de imagem usados numa config (para limpar arquivos que deixaram de ser usados). */
function imagePaths(config: unknown): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string" && /^(banners|categories)\//.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(config);
  return out;
}

export async function saveSectionAction(raw: unknown): Promise<Result> {
  const admin = await requireAdmin();
  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const s = parsed.data;
  const supabase = await getSupabaseServerClient();
  const row = { type: s.type, title: s.title, is_active: s.is_active, starts_at: s.starts_at, ends_at: s.ends_at, config: s.config, updated_by: admin.id };

  if (s.id) {
    const { data: old } = await supabase.from("home_sections").select("config").eq("id", s.id).maybeSingle();
    const { error } = await supabase.from("home_sections").update(row).eq("id", s.id);
    if (error) return { ok: false, error: "Não foi possível salvar a seção." };
    const unused = imagePaths(old?.config).filter((p) => !imagePaths(s.config).includes(p));
    if (unused.length) await supabase.storage.from("store-assets").remove(unused);
    updateTag(HOME_TAG);
    return { ok: true, id: s.id };
  }

  const { data: last } = await supabase.from("home_sections").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("home_sections")
    .insert({ ...row, position: (last?.position ?? 0) + 1 })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Não foi possível criar a seção." };
  updateTag(HOME_TAG);
  return { ok: true, id: data.id };
}

export async function toggleSectionAction(sectionId: string, active: boolean): Promise<Result> {
  await requireAdmin();
  if (!id.safeParse(sectionId).success) return { ok: false, error: "Seção inválida." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("home_sections").update({ is_active: active }).eq("id", sectionId);
  if (error) return { ok: false, error: "Não foi possível alterar." };
  updateTag(HOME_TAG);
  refresh();
  return { ok: true };
}

/** Move uma seção (ou categoria) uma posição para cima/baixo trocando com a vizinha. */
async function swapPositions(table: "home_sections" | "categories", rowId: string, dir: -1 | 1): Promise<Result> {
  const supabase = await getSupabaseServerClient();
  const { data: rows } = await supabase.from(table).select("id, position").order("position");
  const list = rows ?? [];
  const i = list.findIndex((r) => r.id === rowId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Normaliza posições (1..n) e troca as duas.
  const ordered = list.map((r) => r.id);
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  for (const [k, rid] of ordered.entries()) {
    const { error } = await supabase.from(table).update({ position: k + 1 }).eq("id", rid);
    if (error) return { ok: false, error: "Não foi possível reordenar." };
  }
  return { ok: true };
}

export async function moveSectionAction(sectionId: string, dir: -1 | 1): Promise<Result> {
  await requireAdmin();
  if (!id.safeParse(sectionId).success || (dir !== 1 && dir !== -1)) return { ok: false, error: "Dados inválidos." };
  const r = await swapPositions("home_sections", sectionId, dir);
  updateTag(HOME_TAG);
  refresh();
  return r;
}

export async function deleteSectionAction(sectionId: string): Promise<Result> {
  await requireAdmin();
  if (!id.safeParse(sectionId).success) return { ok: false, error: "Seção inválida." };
  const supabase = await getSupabaseServerClient();
  const { data: old } = await supabase.from("home_sections").select("config").eq("id", sectionId).maybeSingle();
  const { error } = await supabase.from("home_sections").delete().eq("id", sectionId);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  const paths = imagePaths(old?.config);
  if (paths.length) await supabase.storage.from("store-assets").remove(paths);
  updateTag(HOME_TAG);
  refresh();
  return { ok: true };
}

export async function addSectionAction(type: SectionType): Promise<Result> {
  if (!SECTION_TYPES.includes(type)) return { ok: false, error: "Tipo inválido." };
  // Seções que precisam de conteúdo nascem desligadas, para não aparecerem vazias.
  const defaults: Record<SectionType, unknown> = {
    banners: { title: "Novo carrossel", is_active: false, config: { slides: [{ image_path: null, title: "Título do banner", subtitle: "", cta_label: "Ver coleção", cta_href: "/produtos" }], autoplay_seconds: 6 } },
    hero: { title: "", config: {} },
    categories: { title: "Categorias", config: {} },
    products: { title: "Nova vitrine", is_active: false, config: { source: "featured", limit: 8, eyebrow: "", link_href: "/produtos" } },
    double_banner: {
      title: "Banner duplo",
      is_active: false,
      config: { items: [{ image_path: null, title: "Leggings", subtitle: "", href: "/produtos?categoria=leggings" }, { image_path: null, title: "Conjuntos", subtitle: "", href: "/produtos?categoria=conjuntos" }] },
    },
    text: { title: "Sobre a Amora", is_active: false, config: { eyebrow: "", body: "Escreva aqui.", align: "center" } },
  };
  return saveSectionAction({ type, ...(defaults[type] as object) });
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------
const categorySchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, { error: "Informe o nome da categoria." }).max(60),
  is_active: z.boolean(),
  image_path: z.string().regex(/^categories\/[0-9a-f-]{36}\.(webp|jpg|jpeg|png)$/i).nullable(),
});

export async function saveCategoryAction(raw: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const c = parsed.data;
  const supabase = await getSupabaseServerClient();

  if (c.id) {
    const { data: old } = await supabase.from("categories").select("image_path").eq("id", c.id).maybeSingle();
    const { error } = await supabase.from("categories").update({ name: c.name, is_active: c.is_active, image_path: c.image_path }).eq("id", c.id);
    if (error) return { ok: false, error: "Não foi possível salvar a categoria." };
    if (old?.image_path && old.image_path !== c.image_path) await supabase.storage.from("store-assets").remove([old.image_path]);
  } else {
    const slug = slugify(c.name);
    const { data: last } = await supabase.from("categories").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("categories").insert({ name: c.name, slug, is_active: c.is_active, image_path: c.image_path, position: (last?.position ?? 0) + 1 });
    if (error) return { ok: false, error: error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar a categoria." };
  }
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function moveCategoryAction(categoryId: string, dir: -1 | 1): Promise<Result> {
  await requireAdmin();
  if (!id.safeParse(categoryId).success) return { ok: false, error: "Dados inválidos." };
  const r = await swapPositions("categories", categoryId, dir);
  updateTag(CATALOG_TAG);
  refresh();
  return r;
}

export async function deleteCategoryAction(categoryId: string): Promise<Result> {
  await requireAdmin();
  if (!id.safeParse(categoryId).success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getSupabaseServerClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
  if ((count ?? 0) > 0) return { ok: false, error: "Esta categoria tem produtos. Mova-os para outra categoria ou desative a categoria." };
  const { data: old } = await supabase.from("categories").select("image_path").eq("id", categoryId).maybeSingle();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  if (old?.image_path) await supabase.storage.from("store-assets").remove([old.image_path]);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}
