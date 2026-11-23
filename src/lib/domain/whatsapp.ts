import { formatBRL, multiplyCents, type Cents } from "./money";
import { formatOrderNumber } from "./order-status";

export type WhatsAppOrder = {
  orderNumber: number | string;
  customerName: string;
  items: {
    productName: string;
    size: string;
    colorName: string;
    quantity: number;
    unitPriceCents: Cents;
  }[];
  subtotalCents: Cents;
  shippingCents: Cents;
  totalCents: Cents;
  /** true enquanto o frete for combinado pelo WhatsApp (v1). */
  shippingToArrange: boolean;
};

export type WhatsAppTexts = {
  greeting: string;
  closing: string;
};

const DEFAULT_TEXTS: WhatsAppTexts = {
  greeting: "Olá! Gostaria de confirmar meu pedido na Amora Fit 💜",
  closing: "Gostaria de confirmar a disponibilidade e as informações para pagamento!",
};

/** Monta a mensagem a partir do pedido JÁ GRAVADO no banco (nunca do carrinho do navegador). */
export function buildOrderMessage(order: WhatsAppOrder, texts?: Partial<WhatsAppTexts>): string {
  const greeting = texts?.greeting?.trim() || DEFAULT_TEXTS.greeting;
  const closing = texts?.closing?.trim() || DEFAULT_TEXTS.closing;

  const lines: string[] = [greeting, "", `Pedido: ${formatOrderNumber(order.orderNumber)}`, `Cliente: ${order.customerName}`, "", "Produtos:"];

  order.items.forEach((item, i) => {
    lines.push(`${i + 1}. ${item.productName}`);
    lines.push(`Tamanho: ${item.size}`);
    lines.push(`Cor: ${item.colorName}`);
    lines.push(`Quantidade: ${item.quantity}`);
    if (item.quantity > 1) {
      lines.push(`Valor: ${formatBRL(item.unitPriceCents)} cada (${formatBRL(multiplyCents(item.unitPriceCents, item.quantity))})`);
    } else {
      lines.push(`Valor: ${formatBRL(item.unitPriceCents)}`);
    }
    lines.push("");
  });

  lines.push(`Subtotal: ${formatBRL(order.subtotalCents)}`);
  if (order.shippingToArrange) {
    lines.push("Frete: a combinar");
  } else if (order.shippingCents > 0) {
    lines.push(`Frete: ${formatBRL(order.shippingCents)}`);
  }
  lines.push(`Total: ${formatBRL(order.totalCents)}${order.shippingToArrange ? " + frete" : ""}`);
  lines.push("", closing);

  return lines.join("\n");
}

/** Link oficial do WhatsApp: https://wa.me/NUMERO?text=MENSAGEM_CODIFICADA */
export function whatsappUrl(phoneDigits: string, message: string): string {
  const phone = phoneDigits.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(phone)) throw new Error("Telefone do WhatsApp inválido nas configurações da loja.");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
