import "server-only";

import { getStoreSettings } from "@/lib/catalog/queries";
import { isOrderStatus, type OrderStatus } from "@/lib/domain/order-status";
import { buildOrderMessage, whatsappUrl } from "@/lib/domain/whatsapp";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Leituras de pedidos COM a sessão do usuário: o RLS garante que o cliente
 * só enxerga os próprios pedidos (e o admin, todos).
 */

export type OrderItemRow = {
  id: string;
  product_name: string;
  product_slug: string | null;
  color_name: string;
  size: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
};

export type ShippingAddress = {
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
};

export type OrderDetail = {
  id: string;
  order_number: number;
  status: OrderStatus;
  customer_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: ShippingAddress;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  customer_note: string | null;
  reservation_expires_at: string | null;
  created_at: string;
  items: OrderItemRow[];
  history: { id: number; from_status: OrderStatus | null; to_status: OrderStatus; note: string | null; created_at: string; changed_by: string | null }[];
  payments: { id: string; method: string; status: string; amount_cents: number; confirmed_at: string | null }[];
  shipments: { carrier: string | null; tracking_code: string | null; tracking_url: string | null; shipped_at: string | null; delivered_at: string | null }[];
};

const ORDER_SELECT = `
  id, order_number, status, customer_id, customer_name, customer_email, customer_phone, shipping_address,
  subtotal_cents, shipping_cents, discount_cents, total_cents, customer_note,
  reservation_expires_at, created_at,
  items:order_items(id, product_name, product_slug, color_name, size, unit_price_cents, quantity, line_total_cents),
  history:order_status_history(id, from_status, to_status, note, created_at, changed_by),
  payments(id, method, status, amount_cents, confirmed_at),
  shipments(carrier, tracking_code, tracking_url, shipped_at, delivered_at)
`;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getOrderForCurrentUser(orderId: string): Promise<OrderDetail | null> {
  if (!UUID.test(orderId)) return null;
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (error) throw new Error(`Falha ao carregar pedido: ${error.message}`);
  if (!data || !isOrderStatus(data.status)) return null;
  const order = data as unknown as OrderDetail;
  order.history = [...(order.history ?? [])].sort((a, b) => a.id - b.id);
  // shipments é 1:1 (unique); normaliza para lista
  order.shipments = Array.isArray(order.shipments) ? order.shipments : order.shipments ? [order.shipments] : [];
  return order;
}

export type OrderSummary = Pick<OrderDetail, "id" | "order_number" | "status" | "total_cents" | "created_at"> & {
  items_count: number;
};

export async function listOrdersForCurrentUser(limit = 50): Promise<OrderSummary[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, status, total_cents, created_at, items:order_items(quantity)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Falha ao carregar pedidos: ${error.message}`);
  return (data ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status as OrderStatus,
    total_cents: o.total_cents,
    created_at: o.created_at,
    items_count: (o.items as { quantity: number }[]).reduce((n, i) => n + i.quantity, 0),
  }));
}

/** Link do WhatsApp montado a partir do pedido gravado + textos/telefone das configurações. */
export async function orderWhatsAppUrl(order: OrderDetail): Promise<string> {
  const settings = await getStoreSettings();
  const message = buildOrderMessage(
    {
      orderNumber: order.order_number,
      customerName: order.customer_name,
      items: order.items.map((i) => ({
        productName: i.product_name,
        size: i.size,
        colorName: i.color_name,
        quantity: i.quantity,
        unitPriceCents: i.unit_price_cents,
      })),
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      totalCents: order.total_cents,
      shippingToArrange: order.shipping_cents === 0,
    },
    { greeting: settings.whatsappOrderGreeting, closing: settings.whatsappOrderClosing },
  );
  return whatsappUrl(settings.whatsappPhone, message);
}
