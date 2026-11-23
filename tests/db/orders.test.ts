import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import {
  asUser,
  createAddress,
  createProduct,
  createTestDb,
  createUser,
  errorOf,
  inventoryOf,
} from "./harness";

type CreateResult = { order_id: string; order_number: number; created: boolean };

let db: PGlite;
let customer: string;
let address: string;
let admin: string;
let legging: { productId: string; variantIds: string[] }; // Preto/P (10), Preto/M (2)
let top: { productId: string; variantIds: string[] }; // Vinho/P (5), promo

async function createOrder(items: { variant_id: string; quantity: number; [k: string]: unknown }[], key = crypto.randomUUID(), user = customer, addr = address) {
  const { rows } = await asUser(db, user, (tx) =>
    tx.query<{ r: CreateResult }>(`select public.create_order($1::jsonb, $2, $3) as r`, [
      JSON.stringify(items),
      addr,
      key,
    ]),
  );
  return rows[0].r;
}

async function setStatus(orderId: string, to: string, extra: { method?: string; shipment?: object; note?: string } = {}) {
  const { rows } = await asUser(db, admin, (tx) =>
    tx.query<{ status: string }>(
      `select (public.admin_set_order_status($1, $2::public.order_status, $3, $4::public.payment_method, $5::jsonb)).status`,
      [orderId, to, extra.note ?? null, extra.method ?? null, extra.shipment ? JSON.stringify(extra.shipment) : null],
    ),
  );
  return rows[0].status;
}

beforeEach(async () => {
  db = await createTestDb();
  customer = await createUser(db, { name: "Maria Cliente", phone: "(12) 99199-2477" });
  admin = await createUser(db, { admin: true });
  address = await createAddress(db, customer);
  legging = await createProduct(db, {
    price: 8990,
    variants: [
      { color: "Preto", size: "P", stock: 10 },
      { color: "Preto", size: "M", stock: 2 },
    ],
  });
  top = await createProduct(db, { price: 7990, promo: 5990, variants: [{ color: "Vinho", size: "P", stock: 5 }] });
});

describe("create_order", () => {
  it("calcula preços no servidor, ignora preço enviado pelo navegador e reserva estoque", async () => {
    const r = await createOrder([
      { variant_id: legging.variantIds[0], quantity: 1, unit_price_cents: 1 }, // tentativa de adulterar
      { variant_id: top.variantIds[0], quantity: 2, price: 0 },
    ]);
    expect(r.created).toBe(true);

    const { rows } = await db.query<{ subtotal_cents: number; total_cents: number; status: string; customer_name: string; customer_phone: string }>(
      `select subtotal_cents, total_cents, status, customer_name, customer_phone from public.orders where id = $1`,
      [r.order_id],
    );
    // 89,90 + 2 x 59,90 (promo) = 209,70
    expect(rows[0]).toEqual({
      subtotal_cents: 20970,
      total_cents: 20970,
      status: "PENDING",
      customer_name: "Maria Cliente",
      customer_phone: "12991992477",
    });

    const items = await db.query<{ unit_price_cents: number; quantity: number; color_name: string; size: string }>(
      `select unit_price_cents, quantity, color_name, size from public.order_items where order_id = $1 order by unit_price_cents`,
      [r.order_id],
    );
    expect(items.rows).toEqual([
      { unit_price_cents: 5990, quantity: 2, color_name: "Vinho", size: "P" },
      { unit_price_cents: 8990, quantity: 1, color_name: "Preto", size: "P" },
    ]);

    expect(await inventoryOf(db, legging.variantIds[0])).toEqual({ on_hand: 10, reserved: 1, available: 9 });
    expect(await inventoryOf(db, top.variantIds[0])).toEqual({ on_hand: 5, reserved: 2, available: 3 });

    const hist = await db.query(`select * from public.order_status_history where order_id = $1`, [r.order_id]);
    expect(hist.rows).toHaveLength(1);
    const mov = await db.query(`select * from public.inventory_movements where order_id = $1 and type = 'reserve'`, [r.order_id]);
    expect(mov.rows).toHaveLength(2);
  });

  it("preserva o preço histórico quando o produto muda de preço depois", async () => {
    const r = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    await db.query(`update public.products set price_cents = 12990 where id = $1`, [legging.productId]);
    const { rows } = await db.query<{ unit_price_cents: number }>(
      `select unit_price_cents from public.order_items where order_id = $1`,
      [r.order_id],
    );
    expect(rows[0].unit_price_cents).toBe(8990);
  });

  it("soma linhas repetidas da mesma variação", async () => {
    const r = await createOrder([
      { variant_id: legging.variantIds[0], quantity: 2 },
      { variant_id: legging.variantIds[0], quantity: 3 },
    ]);
    const { rows } = await db.query<{ quantity: number }>(`select quantity from public.order_items where order_id = $1`, [r.order_id]);
    expect(rows).toEqual([{ quantity: 5 }]);
  });

  it("é idempotente: a mesma chave devolve o mesmo pedido sem reservar de novo", async () => {
    const key = crypto.randomUUID();
    const items = [{ variant_id: legging.variantIds[0], quantity: 2 }];
    const first = await createOrder(items, key);
    const second = await createOrder(items, key);
    expect(second).toEqual({ ...first, created: false });

    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.orders`);
    expect(rows[0].n).toBe(1);
    expect((await inventoryOf(db, legging.variantIds[0])).reserved).toBe(2);
  });

  it("recusa estoque insuficiente sem gravar nada, listando todos os problemas", async () => {
    const err = await errorOf(
      createOrder([
        { variant_id: legging.variantIds[0], quantity: 1 },
        { variant_id: legging.variantIds[1], quantity: 3 }, // só há 2
        { variant_id: crypto.randomUUID(), quantity: 1 }, // não existe
      ]),
    );
    expect(err.message).toBe("AMORA:STOCK_PROBLEM");
    const problems = JSON.parse(err.detail!) as { reason: string; available: number }[];
    expect(problems.map((p) => p.reason).sort()).toEqual(["insufficient_stock", "unavailable"]);
    expect(problems.find((p) => p.reason === "insufficient_stock")!.available).toBe(2);

    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.orders`);
    expect(rows[0].n).toBe(0);
    expect((await inventoryOf(db, legging.variantIds[0])).reserved).toBe(0);
  });

  it("considera reservas de outros pedidos (não vende acima do disponível)", async () => {
    await createOrder([{ variant_id: legging.variantIds[1], quantity: 2 }]);
    const err = await errorOf(createOrder([{ variant_id: legging.variantIds[1], quantity: 1 }]));
    expect(err.message).toBe("AMORA:STOCK_PROBLEM");
  });

  it("recusa produto inativo ou variação desativada", async () => {
    await db.query(`update public.products set status = 'archived' where id = $1`, [top.productId]);
    const err = await errorOf(createOrder([{ variant_id: top.variantIds[0], quantity: 1 }]));
    expect(err.message).toBe("AMORA:STOCK_PROBLEM");
    expect(err.detail).toContain("unavailable");
  });

  it("recusa endereço de outra pessoa", async () => {
    const other = await createUser(db);
    const otherAddress = await createAddress(db, other);
    const err = await errorOf(createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }], undefined, customer, otherAddress));
    expect(err.message).toBe("AMORA:ADDRESS_NOT_FOUND");
  });

  it("recusa entradas inválidas", async () => {
    expect((await errorOf(createOrder([]))).message).toBe("AMORA:INVALID_ITEMS");
    expect((await errorOf(createOrder([{ variant_id: "x", quantity: 1 }]))).message).toBe("AMORA:INVALID_ITEMS");
    expect((await errorOf(createOrder([{ variant_id: legging.variantIds[0], quantity: -1 }]))).message).toBe("AMORA:INVALID_ITEMS");
    expect((await errorOf(createOrder([{ variant_id: legging.variantIds[0], quantity: 0 }]))).message).toBe("AMORA:INVALID_QUANTITY");
    expect((await errorOf(createOrder([{ variant_id: legging.variantIds[0], quantity: 100 }]))).message).toBe("AMORA:INVALID_QUANTITY");
  });

  it("numera pedidos em sequência", async () => {
    const a = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    const b = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    expect(Number(b.order_number)).toBe(Number(a.order_number) + 1);
  });
});

describe("status do pedido", () => {
  it("fluxo completo: pagamento dá baixa no estoque; histórico registra tudo", async () => {
    const { order_id } = await createOrder([{ variant_id: legging.variantIds[0], quantity: 3 }]);

    expect(await setStatus(order_id, "AWAITING_PAYMENT")).toBe("AWAITING_PAYMENT");
    expect(await setStatus(order_id, "PAID", { method: "pix" })).toBe("PAID");
    expect(await inventoryOf(db, legging.variantIds[0])).toEqual({ on_hand: 7, reserved: 0, available: 7 });

    const pay = await db.query<{ method: string; status: string; amount_cents: number; confirmed_by: string }>(
      `select method, status, amount_cents, confirmed_by from public.payments where order_id = $1`,
      [order_id],
    );
    expect(pay.rows[0]).toEqual({ method: "pix", status: "confirmed", amount_cents: 26970, confirmed_by: admin });

    await setStatus(order_id, "PROCESSING");
    await setStatus(order_id, "INVOICED");
    await setStatus(order_id, "SHIPPED", { shipment: { carrier: "Correios", tracking_code: "BR123" } });
    await setStatus(order_id, "COMPLETED");

    const ship = await db.query<{ carrier: string; tracking_code: string; delivered: boolean }>(
      `select carrier, tracking_code, delivered_at is not null as delivered from public.shipments where order_id = $1`,
      [order_id],
    );
    expect(ship.rows[0]).toEqual({ carrier: "Correios", tracking_code: "BR123", delivered: true });

    const hist = await db.query<{ from_status: string | null; to_status: string; changed_by: string }>(
      `select from_status, to_status, changed_by from public.order_status_history where order_id = $1 order by id`,
      [order_id],
    );
    expect(hist.rows.map((h) => `${h.from_status ?? "-"}>${h.to_status}`)).toEqual([
      "->PENDING",
      "PENDING>AWAITING_PAYMENT",
      "AWAITING_PAYMENT>PAID",
      "PAID>PROCESSING",
      "PROCESSING>INVOICED",
      "INVOICED>SHIPPED",
      "SHIPPED>COMPLETED",
    ]);
    expect(hist.rows.slice(1).every((h) => h.changed_by === admin)).toBe(true);
  });

  it("bloqueia transições inconsistentes", async () => {
    const { order_id } = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    expect((await errorOf(setStatus(order_id, "SHIPPED"))).message).toBe("AMORA:INVALID_TRANSITION");
    expect((await errorOf(setStatus(order_id, "COMPLETED"))).message).toBe("AMORA:INVALID_TRANSITION");
    await setStatus(order_id, "CANCELLED");
    expect((await errorOf(setStatus(order_id, "PAID"))).message).toBe("AMORA:INVALID_TRANSITION");
  });

  it("cancelar antes do pagamento libera a reserva", async () => {
    const { order_id } = await createOrder([{ variant_id: legging.variantIds[1], quantity: 2 }]);
    expect((await inventoryOf(db, legging.variantIds[1])).available).toBe(0);
    await setStatus(order_id, "CANCELLED", { note: "Cliente desistiu" });
    expect(await inventoryOf(db, legging.variantIds[1])).toEqual({ on_hand: 2, reserved: 0, available: 2 });
  });

  it("cancelar após o pagamento devolve ao estoque", async () => {
    const { order_id } = await createOrder([{ variant_id: legging.variantIds[0], quantity: 4 }]);
    await setStatus(order_id, "PAID", { method: "pix" });
    expect((await inventoryOf(db, legging.variantIds[0])).on_hand).toBe(6);
    await setStatus(order_id, "PROCESSING");
    await setStatus(order_id, "CANCELLED");
    expect(await inventoryOf(db, legging.variantIds[0])).toEqual({ on_hand: 10, reserved: 0, available: 10 });
    const mov = await db.query<{ type: string }>(
      `select type from public.inventory_movements where order_id = $1 order by id`,
      [order_id],
    );
    expect(mov.rows.map((m) => m.type)).toEqual(["reserve", "sale", "return"]);
  });

  it("não permite cancelar depois de faturado/enviado", async () => {
    const { order_id } = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    await setStatus(order_id, "PAID");
    await setStatus(order_id, "PROCESSING");
    await setStatus(order_id, "INVOICED");
    expect((await errorOf(setStatus(order_id, "CANCELLED"))).message).toBe("AMORA:INVALID_TRANSITION");
  });
});

describe("expiração de reservas", () => {
  it("cancela pedidos vencidos e libera o estoque; mantém os demais", async () => {
    const stale = await createOrder([{ variant_id: legging.variantIds[0], quantity: 2 }]);
    const fresh = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    const paid = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    await setStatus(paid.order_id, "PAID");

    await db.query(`update public.orders set reservation_expires_at = now() - interval '1 hour' where id = $1`, [stale.order_id]);

    const { rows } = await db.query<{ n: number }>(`select private.expire_stale_orders() as n`);
    expect(rows[0].n).toBe(1);

    const statuses = await db.query<{ id: string; status: string }>(`select id, status from public.orders`);
    const byId = Object.fromEntries(statuses.rows.map((r) => [r.id, r.status]));
    expect(byId[stale.order_id]).toBe("CANCELLED");
    expect(byId[fresh.order_id]).toBe("PENDING");
    expect(byId[paid.order_id]).toBe("PAID");

    // 10 - 1 (pago) = 9 em mãos; 1 reservado (fresh)
    expect(await inventoryOf(db, legging.variantIds[0])).toEqual({ on_hand: 9, reserved: 1, available: 8 });

    const hist = await db.query<{ changed_by: string | null }>(
      `select changed_by from public.order_status_history where order_id = $1 and to_status = 'CANCELLED'`,
      [stale.order_id],
    );
    expect(hist.rows[0].changed_by).toBeNull(); // sistema
  });

  it("define o prazo de reserva conforme store_settings (48h)", async () => {
    const r = await createOrder([{ variant_id: legging.variantIds[0], quantity: 1 }]);
    const { rows } = await db.query<{ hours: number }>(
      `select round(extract(epoch from (reservation_expires_at - created_at)) / 3600)::int as hours from public.orders where id = $1`,
      [r.order_id],
    );
    expect(rows[0].hours).toBe(48);
  });
});

describe("ajuste de estoque (admin)", () => {
  it("registra entrada e impede deixar o estoque abaixo do reservado", async () => {
    await asUser(db, admin, (tx) =>
      tx.query(`select public.admin_adjust_inventory($1, 5, 'restock', 'Chegou mercadoria')`, [legging.variantIds[1]]),
    );
    expect((await inventoryOf(db, legging.variantIds[1])).on_hand).toBe(7);

    await createOrder([{ variant_id: legging.variantIds[1], quantity: 6 }]);
    const err = await errorOf(
      asUser(db, admin, (tx) => tx.query(`select public.admin_adjust_inventory($1, -3)`, [legging.variantIds[1]])),
    );
    expect(err.message).toBe("AMORA:STOCK_BELOW_RESERVED");

    const mov = await db.query<{ type: string; actor_id: string; on_hand_after: number }>(
      `select type, actor_id, on_hand_after from public.inventory_movements where variant_id = $1 and type = 'restock'`,
      [legging.variantIds[1]],
    );
    expect(mov.rows[0]).toEqual({ type: "restock", actor_id: admin, on_hand_after: 7 });
  });
});
