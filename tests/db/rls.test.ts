import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, createAddress, createProduct, createTestDb, createUser, errorOf } from "./harness";

let db: PGlite;
let alice: string;
let bob: string;
let admin: string;
let aliceAddress: string;
let bobAddress: string;
let activeVariant: string;
let draftProduct: string;

beforeAll(async () => {
  db = await createTestDb();
  alice = await createUser(db, { name: "Alice" });
  bob = await createUser(db, { name: "Bob" });
  admin = await createUser(db, { name: "Admin", admin: true });
  aliceAddress = await createAddress(db, alice);
  bobAddress = await createAddress(db, bob);
  const active = await createProduct(db, { price: 8990, variants: [{ color: "Preto", size: "M", stock: 5 }] });
  activeVariant = active.variantIds[0];
  const draft = await createProduct(db, { price: 5990, status: "draft", variants: [{ color: "Vinho", size: "P", stock: 5 }] });
  draftProduct = draft.productId;

  await asUser(db, alice, (tx) =>
    tx.query(`select public.create_order($1::jsonb, $2, gen_random_uuid())`, [
      JSON.stringify([{ variant_id: activeVariant, quantity: 1 }]),
      aliceAddress,
    ]),
  );
});

describe("cadastro", () => {
  it("cria o profile como customer, mesmo se o metadata pedir admin", async () => {
    const id = crypto.randomUUID();
    await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, 'x@teste.dev', $2)`, [
      id,
      JSON.stringify({ full_name: "Espertinha", role: "admin" }),
    ]);
    const { rows } = await db.query<{ role: string; full_name: string }>(
      `select role, full_name from public.profiles where id = $1`,
      [id],
    );
    expect(rows[0]).toEqual({ role: "customer", full_name: "Espertinha" });
  });
});

describe("visitante (anon)", () => {
  it("vê categorias, produtos ativos e configurações", async () => {
    await asAnon(db, async (tx) => {
      const cats = await tx.query(`select * from public.categories`);
      expect(cats.rows.length).toBe(5);
      const prods = await tx.query<{ id: string }>(`select id from public.products`);
      expect(prods.rows.map((r) => r.id)).not.toContain(draftProduct);
      const settings = await tx.query<{ whatsapp_phone: string }>(`select whatsapp_phone from public.store_settings`);
      expect(settings.rows[0].whatsapp_phone).toBe("5512991992477");
    });
  });

  it("vê apenas a disponibilidade do estoque (não on_hand/reserved)", async () => {
    await asAnon(db, async (tx) => {
      const { rows } = await tx.query<{ available: number }>(
        `select available from public.inventory where variant_id = $1`,
        [activeVariant],
      );
      expect(rows[0].available).toBe(4);
    });
    const err = await errorOf(asAnon(db, (tx) => tx.query(`select on_hand from public.inventory`)));
    expect(err.message).toMatch(/permission denied/);
  });

  it("não acessa dados privados", async () => {
    for (const table of ["profiles", "addresses", "orders", "order_items", "payments", "shipments", "inventory_movements"]) {
      const err = await errorOf(asAnon(db, (tx) => tx.query(`select * from public.${table}`)));
      expect(err.message, table).toMatch(/permission denied/);
    }
  });

  it("não cria pedido", async () => {
    const err = await errorOf(
      asAnon(db, (tx) =>
        tx.query(`select public.create_order('[]'::jsonb, gen_random_uuid(), gen_random_uuid())`),
      ),
    );
    expect(err.message).toMatch(/permission denied/);
  });
});

describe("cliente", () => {
  it("vê apenas o próprio perfil, endereços e pedidos", async () => {
    await asUser(db, bob, async (tx) => {
      const profiles = await tx.query<{ id: string }>(`select id from public.profiles`);
      expect(profiles.rows.map((r) => r.id)).toEqual([bob]);
      const addresses = await tx.query<{ id: string }>(`select id from public.addresses`);
      expect(addresses.rows.map((r) => r.id)).toEqual([bobAddress]);
      const orders = await tx.query(`select * from public.orders`);
      expect(orders.rows).toHaveLength(0); // o pedido é da Alice
      const items = await tx.query(`select * from public.order_items`);
      expect(items.rows).toHaveLength(0);
    });
    await asUser(db, alice, async (tx) => {
      const orders = await tx.query(`select * from public.orders`);
      expect(orders.rows).toHaveLength(1);
      const history = await tx.query(`select * from public.order_status_history`);
      expect(history.rows).toHaveLength(1);
    });
  });

  it("não consegue se promover a admin", async () => {
    const err = await errorOf(
      asUser(db, alice, (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [alice])),
    );
    expect(err.message).toMatch(/permission denied/);
    const { rows } = await db.query<{ role: string }>(`select role from public.profiles where id = $1`, [alice]);
    expect(rows[0].role).toBe("customer");
  });

  it("atualiza os próprios dados cadastrais, mas não os de outra pessoa", async () => {
    await asUser(db, alice, (tx) =>
      tx.query(`update public.profiles set full_name = 'Alice Souza' where id = $1`, [alice]),
    );
    const bobUpdate = await asUser(db, alice, (tx) =>
      tx.query(`update public.profiles set full_name = 'hack' where id = $1`, [bob]),
    );
    expect(bobUpdate.affectedRows).toBe(0);
    const { rows } = await db.query<{ full_name: string }>(`select full_name from public.profiles where id = $1`, [bob]);
    expect(rows[0].full_name).toBe("Bob");
  });

  it("não cria endereço em nome de outra pessoa", async () => {
    const err = await errorOf(
      asUser(db, alice, (tx) =>
        tx.query(
          `insert into public.addresses (user_id, recipient_name, cep, street, number, district, city, state)
           values ($1, 'X', '12200000', 'Rua', '1', 'Centro', 'Cidade', 'SP')`,
          [bob],
        ),
      ),
    );
    expect(err.message).toMatch(/row-level security/);
  });

  it("não altera status do pedido diretamente nem pela função de admin", async () => {
    const direct = await errorOf(asUser(db, alice, (tx) => tx.query(`update public.orders set status = 'PAID'`)));
    expect(direct.message).toMatch(/permission denied/);

    const { rows } = await db.query<{ id: string }>(`select id from public.orders where customer_id = $1`, [alice]);
    const rpc = await errorOf(
      asUser(db, alice, (tx) => tx.query(`select public.admin_set_order_status($1, 'PAID')`, [rows[0].id])),
    );
    expect(rpc.message).toBe("AMORA:FORBIDDEN");
  });

  it("não insere pedido/itens diretamente (só via create_order)", async () => {
    const err = await errorOf(
      asUser(db, alice, (tx) =>
        tx.query(`insert into public.order_items (order_id, product_name, color_name, size, unit_price_cents, quantity, line_total_cents)
                  values (gen_random_uuid(), 'x', 'x', 'M', 1, 1, 1)`),
      ),
    );
    expect(err.message).toMatch(/permission denied/);
  });

  it("não gerencia produtos, estoque ou configurações", async () => {
    const prod = await errorOf(
      asUser(db, alice, (tx) =>
        tx.query(`insert into public.products (slug, name, price_cents) values ('hack', 'Hack', 100)`),
      ),
    );
    expect(prod.message).toMatch(/row-level security/);

    const price = await asUser(db, alice, (tx) => tx.query(`update public.products set price_cents = 1`));
    expect(price.affectedRows).toBe(0);

    const settings = await asUser(db, alice, (tx) =>
      tx.query(`update public.store_settings set whatsapp_phone = '5511999999999'`),
    );
    expect(settings.affectedRows).toBe(0);

    const stock = await errorOf(
      asUser(db, alice, (tx) => tx.query(`select public.admin_adjust_inventory($1, 100)`, [activeVariant])),
    );
    expect(stock.message).toBe("AMORA:FORBIDDEN");

    const directStock = await errorOf(
      asUser(db, alice, (tx) => tx.query(`update public.inventory set on_hand = 999`)),
    );
    expect(directStock.message).toMatch(/permission denied/);
  });

  it("não chama funções internas do schema private", async () => {
    const err = await errorOf(asUser(db, alice, (tx) => tx.query(`select private.expire_stale_orders()`)));
    expect(err.message).toMatch(/permission denied/);
  });
});

describe("admin", () => {
  it("vê todos os pedidos, perfis e endereços", async () => {
    await asUser(db, admin, async (tx) => {
      const orders = await tx.query(`select * from public.orders`);
      expect(orders.rows.length).toBe(1);
      const profiles = await tx.query(`select * from public.profiles`);
      expect(profiles.rows.length).toBeGreaterThanOrEqual(3);
      const addresses = await tx.query(`select * from public.addresses`);
      expect(addresses.rows.length).toBe(2);
    });
  });

  it("gerencia produtos, rascunhos e configurações", async () => {
    await asUser(db, admin, async (tx) => {
      const drafts = await tx.query(`select id from public.products where status = 'draft'`);
      expect(drafts.rows.length).toBe(1);
      await tx.query(`insert into public.products (slug, name, price_cents) values ('top-novo', 'Top Novo', 5990)`);
      const upd = await tx.query(`update public.store_settings set banner_active = false`);
      expect(upd.affectedRows).toBe(1);
    });
  });

  it("também não pode mudar papéis pela API", async () => {
    const err = await errorOf(
      asUser(db, admin, (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [bob])),
    );
    expect(err.message).toMatch(/permission denied/);
  });
});
