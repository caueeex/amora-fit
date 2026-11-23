// Junta todas as migrations num único arquivo para colar no SQL Editor do Supabase.
// Uso: npm run db:bundle  ->  supabase/bundle/amora-fit-migrations.sql
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dir = path.resolve("supabase/migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const parts = files.map((f) => `-- >>> ${f}\n${readFileSync(path.join(dir, f), "utf8")}\n`);
const out = [
  "-- Amora Fit: todas as migrations em ordem (gerado por scripts/bundle-migrations.mjs).",
  "-- Execute UMA vez num projeto vazio, pelo SQL Editor. Tudo roda numa transação:",
  "-- se algo falhar, nada é aplicado.",
  "begin;",
  ...parts,
  "commit;",
].join("\n");
mkdirSync("supabase/bundle", { recursive: true });
writeFileSync("supabase/bundle/amora-fit-migrations.sql", out);
console.log(`OK: ${files.length} migrations -> supabase/bundle/amora-fit-migrations.sql`);
