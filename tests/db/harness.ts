/**
 * Harness de testes do banco: Postgres real (PGlite/WASM) com uma simulação
 * mínima do ambiente Supabase (papéis anon/authenticated/service_role, schema
 * auth, auth.uid()). Aplica todas as migrations de supabase/migrations em ordem.
 *
 * Limitação: PGlite tem uma única conexão, então concorrência real (dois pedidos
 * disputando a última peça ao mesmo tempo) não é testável aqui. Essa garantia
 * vem do SELECT ... FOR UPDATE + CHECK (reserved <= on_hand) no próprio Postgres.
 */
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = path.join(root, "supabase", "migrations");

const SUPABASE_STUB = /* sql */ `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(
      coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'sub',
      ''
    )::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
`;

export function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create();
  await db.exec(SUPABASE_STUB);
  for (const file of migrationFiles()) {
    try {
      await db.exec(readFileSync(path.join(migrationsDir, file), "utf8"));
    } catch (err) {
      throw new Error(`Falha ao aplicar ${file}: ${(err as Error).message}`);
    }
  }
  return db;
}

type Tx = Transaction;

/** Executa `fn` como um usuário autenticado (RLS ativo), dentro de uma transação. */
export async function asUser<T>(db: PGlite, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await tx.exec("set local role authenticated");
    return fn(tx);
  });
}

/** Executa `fn` como visitante anônimo. */
export async function asAnon<T>(db: PGlite, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', '{"role":"anon"}', true)`);
    await tx.exec("set local role anon");
    return fn(tx);
  });
}

let counter = 0;
/** Cria um usuário em auth.users (o trigger cria o profile). Retorna o id. */
export async function createUser(
  db: PGlite,
  opts: { name?: string; admin?: boolean; phone?: string } = {},
): Promise<string> {
  counter += 1;
  const id = crypto.randomUUID();
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [
    id,
    `user${counter}@teste.dev`,
    JSON.stringify({ full_name: opts.name ?? `Cliente ${counter}`, phone: opts.phone }),
  ]);
  if (opts.admin) {
    // Como "postgres" (dono do banco), igual ao procedimento seguro de promoção.
    await db.query(`update public.profiles set role = 'admin' where id = $1`, [id]);
  }
  return id;
}

export async function createAddress(db: PGlite, userId: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.addresses (user_id, recipient_name, phone, cep, street, number, district, city, state, is_default)
     values ($1, 'Maria Teste', '12991992477', '12200000', 'Rua das Amoras', '10', 'Centro', 'São José dos Campos', 'SP', true)
     returning id`,
    [userId],
  );
  return rows[0].id;
}

/** Produto ativo com variações e estoque. Retorna ids das variações na ordem dada. */
export async function createProduct(
  db: PGlite,
  opts: {
    price: number;
    promo?: number | null;
    status?: "draft" | "active" | "archived";
    variants: { color: string; size: string; stock: number }[];
  },
): Promise<{ productId: string; variantIds: string[] }> {
  counter += 1;
  const { rows } = await db.query<{ id: string }>(
    `insert into public.products (category_id, slug, name, price_cents, promo_price_cents, status)
     values ((select id from public.categories where slug = 'leggings'), $1, $2, $3, $4, $5)
     returning id`,
    [`produto-${counter}`, `Legging Teste ${counter}`, opts.price, opts.promo ?? null, opts.status ?? "active"],
  );
  const productId = rows[0].id;
  const variantIds: string[] = [];
  for (const v of opts.variants) {
    const r = await db.query<{ id: string }>(
      `insert into public.product_variants (product_id, color_name, size) values ($1, $2, $3) returning id`,
      [productId, v.color, v.size],
    );
    variantIds.push(r.rows[0].id);
    await db.query(`update public.inventory set on_hand = $2 where variant_id = $1`, [r.rows[0].id, v.stock]);
  }
  return { productId, variantIds };
}

export async function inventoryOf(db: PGlite, variantId: string) {
  const { rows } = await db.query<{ on_hand: number; reserved: number; available: number }>(
    `select on_hand, reserved, available from public.inventory where variant_id = $1`,
    [variantId],
  );
  return rows[0];
}

/** Extrai o código 'AMORA:XYZ' (ou a mensagem) de um erro do Postgres. */
export async function errorOf(p: Promise<unknown>): Promise<{ message: string; detail?: string; code?: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as { message: string; detail?: string; code?: string };
    return { message: err.message, detail: err.detail, code: err.code };
  }
  throw new Error("Era esperado um erro, mas a operação teve sucesso.");
}
