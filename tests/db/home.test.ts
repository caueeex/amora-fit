import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, createTestDb, createUser, errorOf } from "./harness";

let db: PGlite;
let admin: string;
let customer: string;

beforeAll(async () => {
  db = await createTestDb();
  admin = await createUser(db, { admin: true });
  customer = await createUser(db);
});

describe("home_sections", () => {
  it("nasce com a home atual (6 seções)", async () => {
    const { rows } = await asAnon(db, (tx) => tx.query<{ type: string }>(`select type from public.home_sections order by position`));
    expect(rows.map((r) => r.type)).toEqual(["hero", "categories", "products", "products", "products", "products"]);
  });

  it("visitante só vê seções ativas e dentro do agendamento", async () => {
    await db.query(`insert into public.home_sections (type, title, position, is_active) values ('text', 'Desligada', 10, false)`);
    await db.query(`insert into public.home_sections (type, title, position, starts_at) values ('text', 'Futura', 11, now() + interval '1 day')`);
    await db.query(`insert into public.home_sections (type, title, position, ends_at) values ('text', 'Expirada', 12, now() - interval '1 minute')`);
    await db.query(`insert into public.home_sections (type, title, position, starts_at, ends_at) values ('text', 'No ar', 13, now() - interval '1 hour', now() + interval '1 hour')`);

    const pub = await asAnon(db, (tx) => tx.query<{ title: string }>(`select title from public.home_sections where type = 'text'`));
    expect(pub.rows.map((r) => r.title)).toEqual(["No ar"]);
    const adm = await asUser(db, admin, (tx) => tx.query<{ title: string }>(`select title from public.home_sections where type = 'text' order by position`));
    expect(adm.rows.map((r) => r.title)).toEqual(["Desligada", "Futura", "Expirada", "No ar"]);
  });

  it("só admin edita; tipo e período são validados", async () => {
    const cust = await asUser(db, customer, (tx) => tx.query(`update public.home_sections set title = 'hack'`));
    expect(cust.affectedRows).toBe(0);
    expect((await errorOf(asUser(db, customer, (tx) => tx.query(`insert into public.home_sections (type) values ('text')`)))).message).toMatch(/row-level security/);
    expect((await errorOf(asUser(db, admin, (tx) => tx.query(`insert into public.home_sections (type) values ('script')`)))).message).toMatch(/check constraint/);
    expect(
      (await errorOf(asUser(db, admin, (tx) => tx.query(`insert into public.home_sections (type, starts_at, ends_at) values ('text', now(), now() - interval '1 day')`)))).message,
    ).toMatch(/home_sections_period/);
  });
});
