/**
 * Status de pedido: rótulos e transições. As transições REAIS são validadas
 * no banco (private.order_transition_allowed); esta cópia serve só para a UI
 * mostrar os botões certos. Um teste garante que as duas listas batem.
 */
export const ORDER_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "PAID",
  "PROCESSING",
  "INVOICED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Aguardando atendimento",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAID: "Pagamento confirmado",
  PROCESSING: "Em preparação",
  INVOICED: "Faturado",
  SHIPPED: "Enviado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

/** Texto de apoio para o cliente. INVOICED não afirma emissão de nota fiscal. */
export const STATUS_HINT: Record<OrderStatus, string> = {
  PENDING: "Recebemos seu pedido. Envie a mensagem no WhatsApp para combinarmos frete e pagamento.",
  AWAITING_PAYMENT: "Estamos aguardando a confirmação do seu pagamento.",
  PAID: "Pagamento confirmado! Já vamos separar suas peças.",
  PROCESSING: "Suas peças estão sendo separadas e embaladas com carinho.",
  INVOICED: "Pedido faturado e pronto para envio.",
  SHIPPED: "Seu pedido está a caminho.",
  COMPLETED: "Pedido entregue. Obrigada por comprar com a gente 💜",
  CANCELLED: "Este pedido foi cancelado.",
};

export type StatusTone = "neutral" | "warning" | "success" | "info" | "danger";

export const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  PENDING: "warning",
  AWAITING_PAYMENT: "warning",
  PAID: "success",
  PROCESSING: "info",
  INVOICED: "info",
  SHIPPED: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["AWAITING_PAYMENT", "PAID", "CANCELLED"],
  AWAITING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["INVOICED", "CANCELLED"],
  INVOICED: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** Etapas do caminho "feliz" para a linha do tempo do cliente. */
export const HAPPY_PATH: OrderStatus[] = ["PENDING", "AWAITING_PAYMENT", "PAID", "PROCESSING", "INVOICED", "SHIPPED", "COMPLETED"];

export function formatOrderNumber(n: number | string): string {
  return `#${String(n).padStart(6, "0")}`;
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);
}
