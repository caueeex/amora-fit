import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, createAddress, createTestDb, createUser } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
  const seed = readFileSync("supabase/snippets/dev-seed-products.sql", "utf8");
  await db.exec(seed);
  await db.exec(seed); // idempotente
});

describe("seed de demonstração", () => {
  it("cria 10 produtos ativos com variações e estoque, sem duplicar", async () => {
    const { rows } = await db.query<{ products: number; variants: number }>(
      `select count(distinct p.id)::int as products, count(v.id)::int as variants
         from public.products p join public.product_variants v on v.product_id = p.id
        where p.slug like 'demo-%'`,
    );
    expect(rows[0].products).toBe(10);
    expect(rows[0].variants).toBeGreaterThan(40);
    const soldOut = await db.query<{ n: number }>(`select count(*)::int as n from public.inventory where available = 0`);
    expect(soldOut.rows[0].n).toBeGreaterThan(0);
  });
});

describe("vitrine (anon)", () => {
  it("lê produtos com variações e disponibilidade", async () => {
    await asAnon(db, async (tx) => {
      const { rows } = await tx.query<{ n: number }>(
        `select count(*)::int as n
           from public.products p
           join public.product_variants v on v.product_id = p.id
           join public.inventory i on i.variant_id = v.id
          where p.slug = 'demo-legging-cintura-alta' and i.available >= 0`,
      );
      expect(rows[0].n).toBe(12); // 3 cores x 4 tamanhos
    });
  });

  it("mais vendidos considera só pedidos pagos e expõe apenas ids", async () => {
    const customer = await createUser(db);
    const admin = await createUser(db, { admin: true });
    const address = await createAddress(db, customer);
    const variant = async (slug: string) =>
      (
        await db.query<{ id: string }>(
          `select v.id from public.product_variants v join public.products p on p.id = v.product_id
            join public.inventory i on i.variant_id = v.id
           where p.slug = $1 and i.available > 2 order by v.position limit 1`,
          [slug],
        )
      ).rows[0].id;

    const order = async (slug: string, qty: number, pay: boolean) => {
      const { rows } = await asUser(db, customer, (tx) =>
        tx.query<{ r: { order_id: string } }>(`select public.create_order($1::jsonb, $2, gen_random_uuid()) as r`, [
          JSON.stringify([{ variant_id: v, quantity: qty }]),
          address,
        ]),
      );
      if (pay) {
        await asUser(db, admin, (tx) => tx.query(`select public.admin_set_order_status($1, 'PAID')`, [rows[0].r.order_id]));
      }
    };
    let v = await variant("demo-top-alca-cruzada");
    await order("demo-top-alca-cruzada", 2, true);
    v = await variant("demo-short-modelador");
    await order("demo-short-modelador", 1, true);
    v = await variant("demo-legging-cintura-alta");
    await order("demo-legging-cintura-alta", 3, false); // não pago: não conta

    await asAnon(db, async (tx) => {
      const { rows } = await tx.query<{ id: string; slug: string }>(
        `select b as id, p.slug from public.catalog_best_sellers(8) b join public.products p on p.id = b`,
      );
      expect(rows.map((r) => r.slug)).toEqual(["demo-top-alca-cruzada", "demo-short-modelador"]);
    });
  });
});
