"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { CATALOG_TAG } from "@/lib/catalog/queries";
import { orderErrorMessage } from "@/lib/orders/errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const adjustSchema = z
  .object({
    variantId: z.uuid(),
    mode: z.enum(["entrada", "saida", "definir"]),
    quantity: z.number().int().min(0).max(100000),
    reason: z.string().trim().max(300),
  })
  .refine((d) => d.mode === "entrada" || d.reason.length >= 3, { error: "Informe o motivo (ex.: avaria, contagem física).", path: ["reason"] });

/**
 * entrada  -> +quantidade (tipo "restock")
 * saida    -> -quantidade (tipo "adjustment", motivo obrigatório)
 * definir  -> ajusta para o valor contado (tipo "adjustment", motivo obrigatório)
 * O banco impede deixar o estoque abaixo do que está reservado em pedidos.
 */
export async function adjustStockAction(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adjustSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { variantId, mode, quantity, reason } = parsed.data;

  const supabase = await getSupabaseServerClient();
  let delta = mode === "entrada" ? quantity : -quantity;
  if (mode === "definir") {
    const { data: inv } = await supabase.from("inventory").select("on_hand").eq("variant_id", variantId).maybeSingle();
    if (!inv) return { ok: false, error: "Variação não encontrada." };
    delta = quantity - inv.on_hand;
  }
  if (delta === 0) return { ok: true, message: "Nada a alterar: o estoque já está nesse valor." };

  const { data, error } = await supabase.rpc("admin_adjust_inventory", {
    p_variant_id: variantId,
    p_delta: delta,
    p_type: mode === "entrada" ? "restock" : "adjustment",
    p_note: reason || (mode === "entrada" ? "Entrada de mercadoria" : null),
  });
  if (error) return { ok: false, error: orderErrorMessage(error) };

  updateTag(CATALOG_TAG);
  refresh();
  const after = (data as { on_hand: number }).on_hand;
  return { ok: true, message: `${delta > 0 ? "+" : ""}${delta} un. Estoque agora: ${after}.` };
}

const thresholdSchema = z.object({ variantId: z.uuid(), value: z.number().int().min(0).max(1000) });

export async function setLowStockThresholdAction(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = thresholdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Valor inválido." };
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("inventory").update({ low_stock_threshold: parsed.data.value }).eq("variant_id", parsed.data.variantId);
  if (error) return { ok: false, error: "Não foi possível salvar o mínimo." };
  refresh();
  return { ok: true, message: "Mínimo atualizado." };
}
