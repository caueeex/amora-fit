import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addressSchema, contactSchema } from "@/lib/validators/address";
import { ALLOWED_TRANSITIONS, formatOrderNumber, ORDER_STATUSES } from "./order-status";
import { buildOrderMessage, whatsappUrl } from "./whatsapp";

describe("WhatsApp", () => {
  const order = {
    orderNumber: 123,
    customerName: "Maria Souza",
    items: [
      { productName: "Legging Fitness", size: "M", colorName: "Preto", quantity: 1, unitPriceCents: 8990 },
      { productName: "Top Fitness", size: "P", colorName: "Vinho", quantity: 2, unitPriceCents: 5990 },
    ],
    subtotalCents: 20970,
    shippingCents: 0,
    totalCents: 20970,
    shippingToArrange: true,
  };

  it("monta a mensagem no formato combinado", () => {
    const msg = buildOrderMessage(order, { greeting: "", closing: "" });
    expect(msg).toBe(
      [
        "Olá! Gostaria de confirmar meu pedido na Amora Fit 💜",
        "",
        "Pedido: #000123",
        "Cliente: Maria Souza",
        "",
        "Produtos:",
        "1. Legging Fitness",
        "Tamanho: M",
        "Cor: Preto",
        "Quantidade: 1",
        "Valor: R$ 89,90",
        "",
        "2. Top Fitness",
        "Tamanho: P",
        "Cor: Vinho",
        "Quantidade: 2",
        "Valor: R$ 59,90 cada (R$ 119,80)",
        "",
        "Subtotal: R$ 209,70",
        "Frete: a combinar",
        "Total: R$ 209,70 + frete",
        "",
        "Gostaria de confirmar a disponibilidade e as informações para pagamento!",
      ].join("\n"),
    );
  });

  it("usa os textos configurados pela loja e mostra frete quando houver", () => {
    const msg = buildOrderMessage({ ...order, shippingToArrange: false, shippingCents: 1500, totalCents: 22470 }, { greeting: "Oi!", closing: "Até já" });
    expect(msg.startsWith("Oi!\n")).toBe(true);
    expect(msg).toContain("Frete: R$ 15,00\nTotal: R$ 224,70\n\nAté já");
  });

  it("gera o link oficial wa.me com a mensagem codificada", () => {
    const url = whatsappUrl("5512991992477", "Olá 💜\nPedido: #000001 & cia");
    expect(url).toBe("https://wa.me/5512991992477?text=Ol%C3%A1%20%F0%9F%92%9C%0APedido%3A%20%23000001%20%26%20cia");
    expect(() => whatsappUrl("abc", "x")).toThrow();
  });

  it("formata número do pedido", () => {
    expect(formatOrderNumber(7)).toBe("#000007");
    expect(formatOrderNumber(1234567)).toBe("#1234567");
  });
});

describe("transições de status", () => {
  it("a cópia da UI bate com a função do banco", () => {
    const sql = readFileSync("supabase/migrations/20261122000003_order_functions.sql", "utf8");
    for (const from of ORDER_STATUSES) {
      const match = sql.match(new RegExp(`when '${from}'\\s+then p_to in \\(([^)]*)\\)`));
      const dbTargets = match ? [...match[1].matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]).sort() : [];
      expect([...ALLOWED_TRANSITIONS[from]].sort(), from).toEqual(dbTargets);
    }
  });
});

describe("endereço e contato", () => {
  it("normaliza CEP, UF e telefone", () => {
    const r = addressSchema.parse({
      recipientName: "Maria",
      phone: "(12) 99199-2477",
      cep: "12.200-000",
      street: "Rua das Amoras",
      number: "10",
      district: "Centro",
      city: "São José dos Campos",
      state: "sp",
    });
    expect(r).toMatchObject({ cep: "12200000", state: "SP", phone: "5512991992477", label: "Casa" });
    expect(r.complement).toBeUndefined();
  });

  it("recusa CEP, UF e telefone inválidos", () => {
    const r = addressSchema.safeParse({ recipientName: "M", cep: "123", street: "", number: "", district: "", city: "", state: "XX", phone: "1" });
    expect(r.success).toBe(false);
    const fields = new Set(r.error!.issues.map((i) => i.path[0]));
    for (const f of ["recipientName", "cep", "street", "number", "district", "city", "state", "phone"]) expect(fields.has(f), f).toBe(true);
  });

  it("contato exige WhatsApp válido", () => {
    expect(contactSchema.safeParse({ fullName: "Maria", phone: "12991992477" }).success).toBe(true);
    expect(contactSchema.safeParse({ fullName: "Maria", phone: "" }).success).toBe(false);
  });
});
