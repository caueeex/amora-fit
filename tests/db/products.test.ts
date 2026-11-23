import type { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { asUser, createTestDb, createUser, errorOf, inventoryOf } from "./harness";

let db: PGlite;
let admin: string;
let customer: string;
let categoryId: string;

const save = (product: object, variants: object[], user = admin) =>
  asUser(db, user, (tx) =>
    tx.query<{ id: string }>(`select public.admin_save_product($1::jsonb, $2::jsonb) as id`, [JSON.stringify(product), JSON.stringify(variants)]),
  ).then((r) => r.rows[0].id);

const base = () => ({ slug: "legging-nova", name: "Legging Nova", category_id: categoryId, price_cents: 9990, status: "active", description: "Linda" });

beforeEach(async () => {
  db = await createTestDb();
  admin = await createUser(db, { admin: true });
  customer = await createUser(db);
  categoryId = (await db.query<{ id: string }>(`select id from public.categories where slug = 'leggings'`)).rows[0].id;
});

describe("admin_save_product", () => {
  it("cria produto, variações e estoque inicial com histórico", async () => {
    const id = await save(base(), [
      { color_name: "Preto", color_hex: "#0A0A0A", size: "P", initial_stock: 5 },
      { color_name: "Preto", color_hex: "#0A0A0A", size: "M", initial_stock: 0 },
    ]);
    const { rows } = await db.query<{ id: string; size: string; position: number }>(
      `select id, size, position from public.product_variants where product_id = $1 order by position`,
      [id],
    );
    expect(rows.map((r) => r.size)).toEqual(["P", "M"]);
    expect((await inventoryOf(db, rows[0].id)).on_hand).toBe(5);
    const mov = await db.query<{ type: string; actor_id: string }>(`select type, actor_id from public.inventory_movements where variant_id = $1`, [rows[0].id]);
    expect(mov.rows).toEqual([{ type: "restock", actor_id: admin }]);
  });

  it("edita produto e variações; variação retirada é desativada (não apagada)", async () => {
    const id = await save(base(), [
      { color_name: "Preto", color_hex: "#0A0A0A", size: "P", initial_stock: 2 },
      { color_name: "Vinho", color_hex: "#6B1544", size: "P" },
    ]);
    const variants = (await db.query<{ id: string; color_name: string }>(`select id, color_name from public.product_variants where product_id = $1 order by position`, [id])).rows;

    await save({ ...base(), id, name: "Legging Renomeada", promo_price_cents: 7990 }, [
      { id: variants[0].id, color_name: "Preto", color_hex: "#111111", size: "P", is_active: true },
      { color_name: "Off-white", color_hex: "#F3EDE2", size: "G", initial_stock: 3 },
    ]);

    const p = (await db.query<{ name: string; promo_price_cents: number }>(`select name, promo_price_cents from public.products where id = $1`, [id])).rows[0];
    expect(p).toEqual({ name: "Legging Renomeada", promo_price_cents: 7990 });
    const after = (await db.query<{ color_name: string; is_active: boolean; color_hex: string }>(
      `select color_name, is_active, color_hex from public.product_variants where product_id = $1 order by color_name`,
      [id],
    )).rows;
    expect(after).toEqual([
      { color_name: "Off-white", is_active: true, color_hex: "#F3EDE2" },
      { color_name: "Preto", is_active: true, color_hex: "#111111" },
      { color_name: "Vinho", is_active: false, color_hex: "#6B1544" },
    ]);
    expect((await inventoryOf(db, variants[0].id)).on_hand).toBe(2); // estoque não é mexido na edição
  });

  it("erros amigáveis e nada gravado pela metade", async () => {
    await save(base(), [{ color_name: "Preto", size: "P" }]);
    expect((await errorOf(save(base(), [{ color_name: "Preto", size: "P" }]))).message).toBe("AMORA:SLUG_TAKEN");
    expect((await errorOf(save({ ...base(), slug: "outro", promo_price_cents: 99999 }, []))).message).toBe("AMORA:INVALID_PRODUCT");
    // 2ª variação inválida (tamanho inexistente): o produto e a 1ª variação também não podem ficar gravados
    expect((await errorOf(save({ ...base(), slug: "dup" }, [{ color_name: "A", size: "P", initial_stock: 3 }, { color_name: "B", size: "XXL" }]))).message).toBe("AMORA:INVALID_PRODUCT");
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.products where slug in ('outro', 'dup')`);
    expect(rows[0].n).toBe(0);
  });

  it("só admin pode salvar", async () => {
    expect((await errorOf(save(base(), [], customer))).message).toBe("AMORA:FORBIDDEN");
  });
});
