import "server-only";

import { requireAdmin } from "@/lib/auth/dal";
import type { OrderStatus } from "@/lib/domain/order-status";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Clientes (profiles + pedidos). Dados pessoais só chegam aqui para admin:
 * requireAdmin() no servidor + RLS no banco (profiles/orders/addresses).
 */
const PAID: OrderStatus[] = ["PAID", "PROCESSING", "INVOICED", "SHIPPED", "COMPLETED"];
export const CUSTOMERS_PAGE_SIZE = 25;

export type CustomerRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "customer" | "admin";
  created_at: string;
  orders_count: number;
  paid_count: number;
  total_spent_cents: number;
  last_order_at: string | null;
};

type RawOrder = { id: string; order_number: number; total_cents: number; status: OrderStatus; created_at: string };

function summarize(orders: RawOrder[]) {
  const paid = orders.filter((o) => PAID.includes(o.status));
  return {
    orders_count: orders.length,
    paid_count: paid.length,
    total_spent_cents: paid.reduce((s, o) => s + o.total_cents, 0),
    last_order_at: orders.reduce<string | null>((m, o) => (!m || o.created_at > m ? o.created_at : m), null),
  };
}

const safe = (q: string) => q.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);

export async function listCustomers(f: { q?: string; sort?: string; page: number }) {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, created_at, orders:orders(id, order_number, total_cents, status, created_at)", { count: "exact" });

  const q = f.q?.trim() ?? "";
  if (q) {
    const term = safe(q);
    const digits = q.replace(/\D/g, "");
    const parts = [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`];
    if (digits.length >= 4) parts.push(`phone.ilike.%${digits}%`);
    if (term) query = query.or(parts.join(","));
  }

  // Ordenações por valor gasto precisam de todos os registros; por cadastro, paginamos no banco.
  const bySpend = f.sort === "gasto" || f.sort === "pedidos";
  if (!bySpend) {
    const start = (f.page - 1) * CUSTOMERS_PAGE_SIZE;
    query = query.order("created_at", { ascending: false }).range(start, start + CUSTOMERS_PAGE_SIZE - 1);
  } else {
    query = query.limit(2000);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`Falha ao listar clientes: ${error.message}`);

  let rows: CustomerRow[] = (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    role: p.role,
    created_at: p.created_at,
    ...summarize((p.orders ?? []) as RawOrder[]),
  }));

  if (bySpend) {
    rows.sort((a, b) => (f.sort === "gasto" ? b.total_spent_cents - a.total_spent_cents : b.orders_count - a.orders_count) || b.created_at.localeCompare(a.created_at));
    const start = (f.page - 1) * CUSTOMERS_PAGE_SIZE;
    rows = rows.slice(start, start + CUSTOMERS_PAGE_SIZE);
  }
  return { rows, total: count ?? rows.length };
}

export type CustomerDetail = CustomerRow & {
  cpf: string | null;
  addresses: { id: string; label: string; recipient_name: string; phone: string | null; cep: string; street: string; number: string; complement: string | null; district: string; city: string; state: string; is_default: boolean }[];
  orders: RawOrder[];
};

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, cpf, role, created_at, orders:orders(id, order_number, total_cents, status, created_at), addresses(id, label, recipient_name, phone, cep, street, number, complement, district, city, state, is_default)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Falha ao carregar cliente: ${error.message}`);
  if (!data) return null;
  const orders = ((data.orders ?? []) as RawOrder[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone,
    cpf: data.cpf,
    role: data.role,
    created_at: data.created_at,
    ...summarize(orders),
    orders,
    addresses: ((data.addresses ?? []) as CustomerDetail["addresses"]).sort((a, b) => Number(b.is_default) - Number(a.is_default)),
  };
}
