import { NextResponse, type NextRequest } from "next/server";
import { getCatalog, getCategories } from "@/lib/catalog/queries";
import { suggestSearch } from "@/lib/catalog/suggest";

/**
 * Sugestões da busca (autocomplete). Lê o catálogo público já em cache,
 * então cada tecla não gera consulta ao banco.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  if (q.trim().length < 2) {
    return NextResponse.json({ query: q.trim(), suggestions: [], products: [], total: 0 });
  }
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  return NextResponse.json(suggestSearch(catalog, categories, q), {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
  });
}
