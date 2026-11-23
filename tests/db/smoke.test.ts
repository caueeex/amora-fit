import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createTestDb } from "./harness";

describe("migrations", () => {
  it("aplicam sem erro e configuram categorias e Realtime", async () => {
    const db = await createTestDb();
    const { rows } = await db.query<{ n: number }>("select count(*)::int as n from public.categories");
    expect(rows[0].n).toBe(5);

    const rt = await db.query<{ tablename: string }>(
      "select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1",
    );
    expect(rt.rows.map((r) => r.tablename)).toEqual(["inventory", "order_status_history", "orders"]);

    // As migrations de garantia podem ser rodadas de novo sem erro.
    await db.exec(readFileSync("supabase/migrations/20261122000007_ensure_realtime_storage.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20261122000006_ensure_cron.sql", "utf8"));
    const again = await db.query<{ n: number }>(
      "select count(*)::int as n from pg_publication_tables where pubname = 'supabase_realtime'",
    );
    expect(again.rows[0].n).toBe(3);
  });
});
