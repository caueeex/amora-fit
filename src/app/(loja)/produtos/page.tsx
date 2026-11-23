import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/loja/product-card";
import { filterOptions, filterProducts, parseFilters, type CatalogFilters } from "@/lib/catalog/filters";
import { getCatalog, getCategories } from "@/lib/catalog/queries";
import { sizeRank } from "@/lib/catalog/normalize";
import type { Category } from "@/lib/catalog/types";
import { FilterAutoSubmit } from "./filter-auto-submit";
import { FilterToggle } from "./filter-toggle";

export const metadata: Metadata = { title: "Produtos" };

export default function ProductsPage({ searchParams }: PageProps<"/produtos">) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-8">
      <Suspense fallback={<ListingSkeleton />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Listing({ searchParams }: { searchParams: PageProps<"/produtos">["searchParams"] }) {
  const sp = await searchParams;
  const filters = parseFilters(sp);
  const [catalog, categories] = await Promise.all([getCatalog(), getCategories()]);
  const results = filterProducts(catalog, filters);
  const options = filterOptions(filters.category ? catalog.filter((p) => p.categorySlug === filters.category) : catalog);
  const category = categories.find((c) => c.slug === filters.category);
  const title = filters.q ? `Resultados para “${filters.q}”` : category?.name ?? "Todos os produtos";
  const activeCount =
    filters.sizes.length + filters.colors.length + Number(filters.minCents !== undefined) + Number(filters.maxCents !== undefined) + Number(filters.onlyAvailable);

  return (
    <>
      <header className="mb-6">
        <nav aria-label="Trilha" className="mb-2 text-xs text-creme-100/60">
          <Link href="/" className="hover:text-creme-300">
            Início
          </Link>{" "}
          / <span>{category?.name ?? "Produtos"}</span>
        </nav>
        <h1 className="font-display text-3xl font-bold text-creme-50 sm:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-creme-100/70" aria-live="polite">
          {results.length} {results.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr] lg:items-start">
        <FilterPanel filters={filters} options={options} categories={categories} activeCount={activeCount} />

        {results.length > 0 ? (
          <ProductGrid products={results} priorityCount={2} />
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-14 text-center">
            <p className="font-display text-xl font-bold text-creme-50">Nenhum produto com esses filtros</p>
            <p className="mt-2 text-sm text-creme-100/70">Tente remover algum filtro ou buscar outro termo.</p>
            <Link href="/produtos" className="mt-5 inline-block text-sm font-semibold text-creme-300 underline-offset-4 hover:underline">
              Limpar filtros
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

function FilterPanel({
  filters,
  options,
  categories,
  activeCount,
}: {
  filters: CatalogFilters;
  options: ReturnType<typeof filterOptions>;
  categories: Category[];
  activeCount: number;
}) {
  const chip =
    "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-creme-300/25 px-3.5 text-sm text-creme-100 transition-colors " +
    "hover:border-creme-300/60 has-[:checked]:border-creme-300 has-[:checked]:bg-creme-300 has-[:checked]:font-semibold has-[:checked]:text-amora-900 " +
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-creme-300";

  return (
    <FilterToggle activeCount={activeCount}>
      <form id="filtros" action="/produtos" method="get" className="flex flex-col gap-6 px-4 pb-5">
        <FilterAutoSubmit formId="filtros" />
        {filters.q && <input type="hidden" name="q" value={filters.q} />}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-creme-300/80">Categoria</legend>
          <div className="flex flex-wrap gap-2">
            <label className={chip}>
              <input type="radio" name="categoria" value="" defaultChecked={!filters.category} className="sr-only" />
              Todas
            </label>
            {categories.map((c) => (
              <label key={c.id} className={chip}>
                <input type="radio" name="categoria" value={c.slug} defaultChecked={filters.category === c.slug} className="sr-only" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>

        {options.sizes.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-creme-300/80">Tamanho</legend>
            <div className="flex flex-wrap gap-2">
              {[...options.sizes].sort((a, b) => sizeRank(a) - sizeRank(b)).map((s) => (
                <label key={s} className={`${chip} min-w-11 justify-center`}>
                  <input type="checkbox" name="tamanho" value={s} defaultChecked={filters.sizes.includes(s)} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {options.colors.length > 0 && (
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-creme-300/80">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {options.colors.map((c) => (
                <label key={c.name} className={chip}>
                  <input type="checkbox" name="cor" value={c.name} defaultChecked={filters.colors.includes(c.name)} className="sr-only" />
                  <span className="h-4 w-4 rounded-full ring-1 ring-creme-300/40" style={{ backgroundColor: c.hex }} aria-hidden="true" />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-creme-300/80">Preço (R$)</legend>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="min"
              inputMode="numeric"
              min={0}
              placeholder={String(options.minReais)}
              defaultValue={filters.minCents !== undefined ? filters.minCents / 100 : undefined}
              aria-label="Preço mínimo"
              className="h-11 w-full rounded-xl border border-creme-300/20 bg-amora-950/40 px-3 text-sm text-creme-50 focus:border-creme-300 focus:outline-none"
            />
            <span className="text-creme-100/50">–</span>
            <input
              type="number"
              name="max"
              inputMode="numeric"
              min={0}
              placeholder={String(options.maxReais)}
              defaultValue={filters.maxCents !== undefined ? filters.maxCents / 100 : undefined}
              aria-label="Preço máximo"
              className="h-11 w-full rounded-xl border border-creme-300/20 bg-amora-950/40 px-3 text-sm text-creme-50 focus:border-creme-300 focus:outline-none"
            />
          </div>
        </fieldset>

        <label className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-creme-100">
          <input type="checkbox" name="disponivel" value="1" defaultChecked={filters.onlyAvailable} className="h-5 w-5 accent-creme-300" />
          Somente disponíveis
        </label>

        <div>
          <label htmlFor="ordem" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-creme-300/80">
            Ordenar por
          </label>
          <select
            id="ordem"
            name="ordem"
            defaultValue={filters.sort}
            className="h-11 w-full rounded-xl border border-creme-300/20 bg-amora-950/40 px-3 text-sm text-creme-50 focus:border-creme-300 focus:outline-none"
          >
            <option value="relevancia">Relevância</option>
            <option value="novidades">Novidades</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="min-h-11 flex-1 rounded-full bg-creme-300 text-sm font-semibold text-amora-900 transition-colors hover:bg-creme-200 active:scale-[0.98]">
            Aplicar
          </button>
          <Link href="/produtos" className="grid min-h-11 place-items-center rounded-full border border-creme-300/30 px-4 text-sm text-creme-100 hover:border-creme-300">
            Limpar
          </Link>
        </div>
      </form>
    </FilterToggle>
  );
}

function ListingSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden="true">
      <div className="mb-6 h-10 w-64 rounded-lg bg-creme-300/10" />
      <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[4/6] rounded-[var(--radius-card)] bg-creme-300/10" />
        ))}
      </div>
    </div>
  );
}
