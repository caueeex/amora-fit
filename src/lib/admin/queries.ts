import "server-only";

import { requireAdmin } from "@/lib/auth/dal";
import type { OrderStatus } from "@/lib/domain/order-status";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Consultas do painel. Sempre com a sessão do admin (RLS libera tudo para admin,
 * e nada para quem não é). requireAdmin() garante a checagem também aqui.
 */

const SP_OFFSET = "-03:00"; // America/Sao_Paulo (sem horário de verão desde 2019)

export type Dashboard = {
  orders_count: number;
  paid_count: number;
  cancelled_count: number;
  revenue_cents: number;
  items_sold: number;
  status_now: Partial<Record<OrderStatus, number>>;
  daily: { day: string; revenue_cents: number; orders: number }[];
  top_products: { name: string; slug: string | null; quantity: number; revenue_cents: number }[];
  low_stock_count: number;
  low_stock: { product_id: string; product_name: string; color_name: string; size: string; available: number; low_stock_threshold: number }[];
};

export function periodRange(days: number, now = new Date()) {
  const todaySp = new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);
  const end = new Date(`${todaySp}T00:00:00${SP_OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { from: start.toISOString(), to: end.toISOString() };
}

export async function getDashboard(days: number): Promise<Dashboard | null> {
  await requireAdmin();
  const { from, to } = periodRange(days);
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_dashboard", { p_from: from, p_to: to });
  // Função ainda não criada no banco (migration 0010 pendente): a página mostra instrução.
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  if (error) throw new Error(`Falha ao carregar indicadores: ${error.message}`);
  return data as Dashboard;
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export const ORDER_TABS = {
  novos: { label: "Novos", statuses: ["PENDING"] },
  pagamento: { label: "Aguardando pagamento", statuses: ["AWAITING_PAYMENT"] },
  andamento: { label: "Em andamento", statuses: ["PAID", "PROCESSING", "INVOICED", "SHIPPED"] },
  concluidos: { label: "Concluídos", statuses: ["COMPLETED"] },
  cancelados: { label: "Cancelados", statuses: ["CANCELLED"] },
  todos: { label: "Todos", statuses: [] },
} as const satisfies Record<string, { label: string; statuses: OrderStatus[] }>;

export type OrderTab = keyof typeof ORDER_TABS;

export type AdminOrderRow = {
  id: string;
  order_number: number;
  status: OrderStatus;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  total_cents: number;
  created_at: string;
  items_count: number;
};

export type OrderListFilters = { tab: OrderTab; q?: string; from?: string; to?: string; page: number };
export const ORDERS_PAGE_SIZE = 20;

/** Remove caracteres com significado especial no filtro do PostgREST. */
function safeTerm(q: string): string {
  return q.replace(/[,()*%\\:"'.]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export async function listAdminOrders(f: OrderListFilters) {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select("id, order_number, status, customer_name, customer_email, customer_phone, total_cents, created_at, items:order_items(quantity)", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  const statuses = ORDER_TABS[f.tab].statuses as readonly OrderStatus[];
  if (statuses.length) query = query.in("status", [...statuses]);

  const q = f.q?.trim() ?? "";
  if (/^#?\d{1,9}$/.test(q)) {
    query = query.eq("order_number", Number(q.replace("#", "")));
  } else if (q) {
    const term = safeTerm(q);
    const digits = q.replace(/\D/g, "");
    const parts = [`customer_name.ilike.%${term}%`, `customer_email.ilike.%${term}%`];
    if (digits.length >= 4) parts.push(`customer_phone.ilike.%${digits}%`);
    if (term) query = query.or(parts.join(","));
  }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) query = query.gte("created_at", `${f.from}T00:00:00${SP_OFFSET}`);
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) {
    const end = new Date(`${f.to}T00:00:00${SP_OFFSET}`);
    end.setUTCDate(end.getUTCDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const start = (f.page - 1) * ORDERS_PAGE_SIZE;
  const { data, error, count } = await query.range(start, start + ORDERS_PAGE_SIZE - 1);
  if (error) throw new Error(`Falha ao listar pedidos: ${error.message}`);

  const rows: AdminOrderRow[] = (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status as OrderStatus,
    customer_name: o.customer_name,
    customer_email: o.customer_email,
    customer_phone: o.customer_phone,
    total_cents: o.total_cents,
    created_at: o.created_at,
    items_count: ((o.items ?? []) as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0),
  }));
  return { rows, total: count ?? 0 };
}

/** Quantidade de pedidos em cada aba (para os contadores). */
export async function countOrdersByTab(): Promise<Record<OrderTab, number>> {
  await requireAdmin();
  const supabase = await getSupabaseServerClient();
  const entries = await Promise.all(
    (Object.keys(ORDER_TABS) as OrderTab[]).map(async (tab) => {
      let q = supabase.from("orders").select("id", { count: "exact", head: true });
      const statuses = ORDER_TABS[tab].statuses as readonly OrderStatus[];
      if (statuses.length) q = q.in("status", [...statuses]);
      const { count } = await q;
      return [tab, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<OrderTab, number>;
}

export async function countPendingOrders(): Promise<number> {
  const supabase = await getSupabaseServerClient();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "PENDING");
  return count ?? 0;
}
