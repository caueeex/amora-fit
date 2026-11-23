import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asUser, createAddress, createProduct, createTestDb, createUser, errorOf } from "./harness";

let db: PGlite;
let admin: string;
let customer: string;

type Dash = {
  orders_count: number;
  paid_count: number;
  cancelled_count: number;
  revenue_cents: number;
  items_sold: number;
  status_now: Record<string, number>;
  daily: { day: string; revenue_cents: number; orders: number }[];
  top_products: { name: string; quantity: number; revenue_cents: number }[];
  low_stock_count: number;
  low_stock: { product_name: string; size: string; available: number }[];
};

const dash = (from: string, to: string, user = admin) =>
  asUser(db, user, (tx) => tx.query<{ d: Dash }>(`select public.admin_dashboard($1, $2) as d`, [from, to])).then((r) => r.rows[0].d);

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, { admin: true });
  customer = await createUser(db);
  const address = await createAddress(db, customer);
  const legging = await createProduct(db, { price: 8990, variants: [{ color: "Preto", size: "M", stock: 10 }] });
  const top = await createProduct(db, { price: 5990, variants: [{ color: "Vinho", size: "P", stock: 2 }] });

  const order = async (variant: string, qty: number) => {
    const { rows } = await asUser(db, customer, (tx) =>
      tx.query<{ r: { order_id: string } }>(`select public.create_order($1::jsonb, $2, gen_random_uuid()) as r`, [
        JSON.stringify([{ variant_id: variant, quantity: qty }]),
        address,
      ]),
    );
    return rows[0].r.order_id;
  };
  const status = (id: string, to: string) => asUser(db, admin, (tx) => tx.query(`select public.admin_set_order_status($1, $2::public.order_status)`, [id, to]));

  const a = await order(legging.variantIds[0], 2); // pago
  await status(a, "PAID");
  const b = await order(top.variantIds[0], 1); // pago
  await status(b, "PAID");
  await status(b, "PROCESSING");
  await order(legging.variantIds[0], 1); // pendente
  const c = await order(legging.variantIds[0], 1); // cancelado
  await status(c, "CANCELLED");
});

describe("admin_dashboard", () => {
  const from = new Date(Date.now() - 6 * 86400_000).toISOString();
  const to = new Date(Date.now() + 86400_000).toISOString();

  it("calcula faturamento só de pedidos pagos", async () => {
    const d = await dash(from, to);
    expect(d.orders_count).toBe(4);
    expect(d.paid_count).toBe(2);
    expect(d.cancelled_count).toBe(1);
    expect(d.revenue_cents).toBe(2 * 8990 + 5990);
    expect(d.items_sold).toBe(3);
    expect(d.status_now).toMatchObject({ PAID: 1, PROCESSING: 1, PENDING: 1, CANCELLED: 1 });
  });

  it("série diária cobre todos os dias do período (dias sem venda = 0)", async () => {
    const d = await dash(from, to);
    expect(d.daily.length).toBeGreaterThanOrEqual(7);
    expect(d.daily.reduce((s, x) => s + x.revenue_cents, 0)).toBe(2 * 8990 + 5990);
    expect(d.daily.filter((x) => x.orders === 0).length).toBeGreaterThan(0);
  });

  it("mais vendidos e estoque baixo", async () => {
    const d = await dash(from, to);
    expect(d.top_products.map((t) => t.quantity)).toEqual([2, 1]);
    // Top: 2 em estoque, 1 vendido => 1 disponível (<= limite 3)
    expect(d.low_stock_count).toBe(1);
    expect(d.low_stock[0]).toMatchObject({ size: "P", available: 1 });
  });

  it("só admin acessa e o período é validado", async () => {
    expect((await errorOf(dash(from, to, customer))).message).toBe("AMORA:FORBIDDEN");
    expect((await errorOf(dash(to, from))).message).toBe("AMORA:INVALID_PERIOD");
  });
});
