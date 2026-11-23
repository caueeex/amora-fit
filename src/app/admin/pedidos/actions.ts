"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/catalog/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { ORDER_STATUSES } from "@/lib/domain/order-status";
import { orderErrorMessage } from "@/lib/orders/errors";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const httpsUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), { error: "O link de rastreio precisa começar com https://" });

const statusSchema = z.object({
  orderId: z.uuid(),
  to: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "bank_transfer", "other"]).optional(),
  shipment: z
    .object({
      carrier: z.string().trim().max(80).optional(),
      tracking_code: z.string().trim().max(80).optional(),
      tracking_url: httpsUrl.optional(),
    })
    .optional(),
});

/** Muda o status do pedido. A transição é validada no banco (admin_set_order_status). */
export async function changeOrderStatusAction(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { orderId, to, note, paymentMethod, shipment } = parsed.data;

  if (to === "CANCELLED" && !note) return { ok: false, error: "Informe o motivo do cancelamento." };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_order_status", {
    p_order_id: orderId,
    p_to: to,
    p_note: note || null,
    p_payment_method: to === "PAID" ? paymentMethod ?? "pix" : null,
    p_shipment: to === "SHIPPED" ? { ...shipment, tracking_url: shipment?.tracking_url || undefined } : null,
  });
  if (error) return { ok: false, error: orderErrorMessage(error) };

  // Pagamento confirmado e cancelamento mexem no estoque: atualiza a vitrine.
  if (to === "PAID" || to === "CANCELLED") updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

const shipmentSchema = z.object({
  orderId: z.uuid(),
  carrier: z.string().trim().max(80),
  tracking_code: z.string().trim().max(80),
  tracking_url: httpsUrl,
});

/** Atualiza transportadora/rastreio sem mudar o status. */
export async function updateShipmentAction(raw: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = shipmentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("admin_upsert_shipment", {
    p_order_id: d.orderId,
    p_carrier: d.carrier || null,
    p_tracking_code: d.tracking_code || null,
    p_tracking_url: d.tracking_url || null,
    p_note: null,
  });
  if (error) return { ok: false, error: orderErrorMessage(error) };
  refresh();
  return { ok: true };
}
