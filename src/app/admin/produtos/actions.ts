"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { CATALOG_TAG } from "@/lib/catalog/queries";
import { orderErrorMessage } from "@/lib/orders/errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/lib/validators/product";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string; field?: string };
export type ActionResult = { ok: true } | { ok: false; error: string };

/** Cria/edita produto + variações (transação única no banco). */
export async function saveProductAction(raw: unknown): Promise<SaveResult> {
  await requireAdmin();
  const parsed = productFormSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Dados inválidos.", field: String(issue?.path[0] ?? "") };
  }
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_save_product", {
    p_product: parsed.data.product,
    p_variants: parsed.data.variants,
  });
  if (error) return { ok: false, error: orderErrorMessage(error), field: error.message.includes("SLUG") ? "slug" : undefined };
  updateTag(CATALOG_TAG);
  return { ok: true, id: data as string };
}

const idSchema = z.uuid();

/** Exclui de vez só produtos que nunca foram vendidos; os demais devem ser arquivados. */
export async function deleteProductAction(productId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produto inválido." };
  const supabase = await getSupabaseServerClient();
  const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", productId);
  if ((count ?? 0) > 0) return { ok: false, error: "Este produto já foi vendido e não pode ser excluído. Use “Arquivar” para tirá-lo da loja." };

  const { data: imgs } = await supabase.from("product_images").select("storage_path").eq("product_id", productId);
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: "Não foi possível excluir o produto." };
  if (imgs?.length) await supabase.storage.from("product-images").remove(imgs.map((i) => i.storage_path));
  updateTag(CATALOG_TAG);
  return { ok: true };
}

export async function setProductStatusAction(productId: string, status: "draft" | "active" | "archived"): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(productId).success || !["draft", "active", "archived"].includes(status)) return { ok: false, error: "Dados inválidos." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("products").update({ status }).eq("id", productId);
  if (error) return { ok: false, error: "Não foi possível alterar a situação." };
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fotos (o arquivo já foi enviado ao Storage pelo navegador do admin; aqui
// registramos/alteramos as linhas em product_images).
// ---------------------------------------------------------------------------
const pathSchema = z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-z-]+\.(webp|jpg|jpeg|png|avif)$/i, { error: "Caminho de imagem inválido." });

export async function addProductImagesAction(productId: string, paths: string[], altBase: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Produto inválido." };
  const valid = z.array(pathSchema).min(1).max(12).safeParse(paths);
  if (!valid.success) return { ok: false, error: "Arquivos inválidos." };
  if (!valid.data.every((p) => p.startsWith(`products/${productId}/`))) return { ok: false, error: "Arquivos de outro produto." };

  const supabase = await getSupabaseServerClient();
  const { data: last } = await supabase.from("product_images").select("position").eq("product_id", productId).order("position", { ascending: false }).limit(1).maybeSingle();
  const start = (last?.position ?? -1) + 1;
  const { error } = await supabase.from("product_images").insert(
    valid.data.map((storage_path, i) => ({ product_id: productId, storage_path, alt_text: altBase.slice(0, 200), position: start + i })),
  );
  if (error) return { ok: false, error: "Não foi possível salvar as fotos." };
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

const imageUpdateSchema = z.object({
  id: z.uuid(),
  alt_text: z.string().trim().max(200),
  color_name: z.string().trim().max(40).nullable(),
});

export async function updateProductImageAction(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = imageUpdateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const supabase = await getSupabaseServerClient();
  const { id, alt_text, color_name } = parsed.data;
  let { error } = await supabase.from("product_images").update({ alt_text, color_name: color_name || null }).eq("id", id);
  // Banco sem a coluna color_name (migration 0010 pendente): salva só o texto alternativo.
  if (error?.code === "PGRST204") ({ error } = await supabase.from("product_images").update({ alt_text }).eq("id", id));
  if (error) return { ok: false, error: "Não foi possível salvar a foto." };
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function reorderProductImagesAction(productId: string, orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const ok = idSchema.safeParse(productId).success && z.array(z.uuid()).max(30).safeParse(orderedIds).success;
  if (!ok) return { ok: false, error: "Dados inválidos." };
  const supabase = await getSupabaseServerClient();
  for (const [position, id] of orderedIds.entries()) {
    const { error } = await supabase.from("product_images").update({ position }).eq("id", id).eq("product_id", productId);
    if (error) return { ok: false, error: "Não foi possível reordenar." };
  }
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

export async function deleteProductImageAction(imageId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!idSchema.safeParse(imageId).success) return { ok: false, error: "Foto inválida." };
  const supabase = await getSupabaseServerClient();
  const { data: img } = await supabase.from("product_images").select("storage_path").eq("id", imageId).maybeSingle();
  if (!img) return { ok: false, error: "Foto não encontrada." };
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: "Não foi possível remover a foto." };
  await supabase.storage.from("product-images").remove([img.storage_path]);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}
