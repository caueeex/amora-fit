import "server-only";

import { requireAdmin } from "@/lib/auth/dal";
import { sizeRank } from "@/lib/catalog/normalize";
import { foldText } from "@/lib/catalog/filters";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ProductStatus } from "./product-status";

export type StockRow = {
  variant_id: string;
  product_id: string;
  product_name: string;
  product_status: ProductStatus;
  color_name: string;
  color_hex: string;
  size: string;
  is_active: boolean;
  on_hand: number;
  reserved: number;
  available: number;
  low_stock_threshold: number;
};

export async function listStock(f: { q?: string; filter?: string }): Promise<StockRow[]> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, color_name, color_hex, size, is_active, position, product:products!inner(id, name, status), inventory(on_hand, reserved, available, low_stock_threshold)")
    .limit(5000);
  if (error) throw new Error(`Falha ao carregar estoque: ${error.message}`);

  type Inv = { on_hand: number; reserved: number; available: number; low_stock_threshold: number };
  type Raw = { id: string; color_name: string; color_hex: string; size: string; is_active: boolean; position: number; product: { id: string; name: string; status: ProductStatus }; inventory: Inv | Inv[] | null };

  const terms = f.q ? foldText(f.q).split(/\s+/).filter(Boolean) : [];
  return (data as unknown as Raw[])
    .map((v) => {
      const inv = (Array.isArray(v.inventory) ? v.inventory[0] : v.inventory) ?? { on_hand: 0, reserved: 0, available: 0, low_stock_threshold: 3 };
      return {
        variant_id: v.id,
        product_id: v.product.id,
        product_name: v.product.name,
        product_status: v.product.status,
        color_name: v.color_name,
        color_hex: v.color_hex,
        size: v.size,
        is_active: v.is_active,
        position: v.position,
        ...inv,
      };
    })
    .filter((r) => {
      if (f.filter === "baixo" && !(r.is_active && r.product_status === "active" && r.available <= r.low_stock_threshold)) return false;
      if (f.filter === "esgotado" && !(r.is_active && r.available === 0)) return false;
      if (f.filter !== "todos" && f.filter !== "inativos" && (!r.is_active || r.product_status === "archived")) return false;
      if (f.filter === "inativos" && r.is_active && r.product_status !== "archived") return false;
      if (terms.length && !terms.every((t) => foldText(`${r.product_name} ${r.color_name} ${r.size}`).includes(t))) return false;
      return true;
    })
    .sort((a, b) => a.product_name.localeCompare(b.product_name, "pt-BR") || a.position - b.position || sizeRank(a.size) - sizeRank(b.size))
    .map((r) => {
      const { position, ...rest } = r;
      void position;
      return rest;
    });
}

export type Movement = {
  id: number;
  type: "restock" | "adjustment" | "reserve" | "release" | "sale" | "return";
  delta_on_hand: number;
  delta_reserved: number;
  on_hand_after: number;
  reserved_after: number;
  note: string | null;
  created_at: string;
  order_id: string | null;
  actor: string | null;
  product_name: string | null;
  color_name: string | null;
  size: string | null;
};

export async function listMovements(f: { type?: string; page: number }): Promise<{ rows: Movement[]; total: number }> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const PAGE = 50;
  let q = supabase
    .from("inventory_movements")
    .select("id, type, delta_on_hand, delta_reserved, on_hand_after, reserved_after, note, created_at, order_id, actor:profiles(full_name), variant:product_variants(color_name, size, product:products(name))", { count: "exact" })
    .order("id", { ascending: false });
  if (f.type && ["restock", "adjustment", "reserve", "release", "sale", "return"].includes(f.type)) q = q.eq("type", f.type);
  const start = (f.page - 1) * PAGE;
  const { data, error, count } = await q.range(start, start + PAGE - 1);
  if (error) throw new Error(`Falha ao carregar movimentações: ${error.message}`);

  type Raw = Omit<Movement, "actor" | "product_name" | "color_name" | "size"> & {
    actor: { full_name: string } | null;
    variant: { color_name: string; size: string; product: { name: string } | null } | null;
  };
  const rows = (data as unknown as Raw[]).map(({ actor, variant, ...m }) => ({
    ...m,
    actor: actor?.full_name || null,
    product_name: variant?.product?.name ?? null,
    color_name: variant?.color_name ?? null,
    size: variant?.size ?? null,
  }));
  return { rows, total: count ?? 0 };
}
