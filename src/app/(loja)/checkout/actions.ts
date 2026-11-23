"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { CATALOG_TAG } from "@/lib/catalog/queries";
import { storagePublicUrl } from "@/lib/catalog/normalize";
import { publicEnv } from "@/lib/env";
import { orderErrorMessage, stockProblems, type StockProblem } from "@/lib/orders/errors";
import { getOrderForCurrentUser, orderWhatsAppUrl } from "@/lib/orders/queries";
import { getSupabasePublicClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { addressSchema, contactSchema } from "@/lib/validators/address";
import { fieldErrorsFrom } from "@/lib/validators/auth";

const itemsSchema = z
  .array(
    z.object({
      variantId: z.uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(50);

// ---------------------------------------------------------------------------
// Cotação: preços e disponibilidade ATUAIS, direto do banco (sem cache).
// O navegador só informa variante + quantidade.
// ---------------------------------------------------------------------------
export type QuoteLine = {
  variantId: string;
  quantity: number;
  ok: boolean;
  reason?: "unavailable" | "insufficient_stock";
  available: number;
  unitPriceCents: number;
  productName: string;
  slug: string;
  colorName: string;
  size: string;
  imageUrl: string | null;
};

export async function quoteCartAction(raw: unknown): Promise<{ lines: QuoteLine[] } | { error: string }> {
  const parsed = itemsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Carrinho inválido." };

  const ids = parsed.data.map((i) => i.variantId);
  const { data, error } = await getSupabasePublicClient()
    .from("product_variants")
    .select(
      "id, color_name, size, inventory(available), product:products(name, slug, price_cents, promo_price_cents, images:product_images(storage_path, position))",
    )
    .in("id", ids);
  if (error) return { error: "Não foi possível conferir o carrinho agora." };

  type Row = {
    id: string;
    color_name: string;
    size: string;
    inventory: { available: number } | { available: number }[] | null;
    product: { name: string; slug: string; price_cents: number; promo_price_cents: number | null; images: { storage_path: string; position: number }[] } | null;
  };
  const byId = new Map((data as unknown as Row[]).map((r) => [r.id, r]));

  const lines: QuoteLine[] = parsed.data.map(({ variantId, quantity }) => {
    const r = byId.get(variantId);
    // RLS só devolve variações ativas de produtos ativos: ausente = indisponível.
    if (!r || !r.product) {
      return { variantId, quantity, ok: false, reason: "unavailable", available: 0, unitPriceCents: 0, productName: "", slug: "", colorName: "", size: "", imageUrl: null };
    }
    const inv = Array.isArray(r.inventory) ? r.inventory[0] : r.inventory;
    const available = Math.max(0, inv?.available ?? 0);
    const firstImage = [...(r.product.images ?? [])].sort((a, b) => a.position - b.position)[0];
    return {
      variantId,
      quantity,
      ok: available >= quantity,
      reason: available === 0 ? "unavailable" : available < quantity ? "insufficient_stock" : undefined,
      available,
      unitPriceCents: r.product.promo_price_cents ?? r.product.price_cents,
      productName: r.product.name,
      slug: r.product.slug,
      colorName: r.color_name,
      size: r.size,
      imageUrl: firstImage ? storagePublicUrl(publicEnv.supabaseUrl, "product-images", firstImage.storage_path) : null,
    };
  });

  return { lines };
}

// ---------------------------------------------------------------------------
// Endereço
// ---------------------------------------------------------------------------
export type SavedAddress = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  is_default: boolean;
};

export async function saveAddressAction(
  raw: unknown,
): Promise<{ address: SavedAddress } | { error: string; fieldErrors?: Partial<Record<string, string>> }> {
  const parsed = addressSchema.safeParse(raw);
  if (!parsed.success) return { error: "Confira os campos destacados.", fieldErrors: fieldErrorsFrom(parsed.error) };

  const supabase = await getSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Sua sessão expirou. Entre novamente." };

  const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 10) return { error: "Limite de 10 endereços atingido. Remova algum em Minha conta." };
  const makeDefault = parsed.data.isDefault || (count ?? 0) === 0;
  if (makeDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);

  const a = parsed.data;
  const { data, error } = await supabase
    .from("addresses")
    .insert({
      user_id: userId,
      label: a.label,
      recipient_name: a.recipientName,
      phone: a.phone ?? null,
      cep: a.cep,
      street: a.street,
      number: a.number,
      complement: a.complement ?? null,
      district: a.district,
      city: a.city,
      state: a.state,
      is_default: makeDefault,
    })
    .select("id, label, recipient_name, phone, cep, street, number, complement, district, city, state, is_default")
    .single();
  if (error) return { error: "Não foi possível salvar o endereço." };
  return { address: data as SavedAddress };
}

// ---------------------------------------------------------------------------
// Criação do pedido
// ---------------------------------------------------------------------------
const placeOrderSchema = z.object({
  items: itemsSchema,
  addressId: z.uuid(),
  idempotencyKey: z.uuid(),
  note: z.string().trim().max(500).optional(),
  contact: z.object({ fullName: z.string(), phone: z.string() }),
});

export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: number; whatsappUrl: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>>; stockProblems?: StockProblem[] };

export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dados do pedido inválidos. Atualize a página e tente de novo." };

  const contact = contactSchema.safeParse(parsed.data.contact);
  if (!contact.success) return { ok: false, error: "Confira seus dados de contato.", fieldErrors: fieldErrorsFrom(contact.error) };

  const supabase = await getSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "Sua sessão expirou. Entre novamente para finalizar." };

  // Atualiza nome/WhatsApp do perfil (colunas liberadas pelo RLS) antes do snapshot no pedido.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: contact.data.fullName, phone: contact.data.phone })
    .eq("id", userId);
  if (profileError) return { ok: false, error: "Não foi possível atualizar seus dados de contato." };

  const { data, error } = await supabase.rpc("create_order", {
    p_items: parsed.data.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_address_id: parsed.data.addressId,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_customer_note: parsed.data.note || null,
  });
  if (error) {
    return { ok: false, error: orderErrorMessage(error), stockProblems: stockProblems(error) };
  }

  const result = data as { order_id: string; order_number: number; created: boolean };
  // Estoque mudou (reserva): a vitrine passa a mostrar a disponibilidade nova.
  if (result.created) updateTag(CATALOG_TAG);

  const order = await getOrderForCurrentUser(result.order_id);
  if (!order) return { ok: false, error: "Pedido criado, mas não foi possível carregá-lo. Veja em Minha conta." };

  return { ok: true, orderId: order.id, orderNumber: order.order_number, whatsappUrl: await orderWhatsAppUrl(order) };
}
