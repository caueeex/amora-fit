import Link from "next/link";
import { AmoraIcon } from "@/components/brand/logo";
import { Hero } from "@/components/loja/hero";
import { ProductGrid } from "@/components/loja/product-card";
import { Section } from "@/components/loja/section";
import { getBestSellerIds, getCatalog, getCategories, getStoreSettings } from "@/lib/catalog/queries";
import type { CatalogProduct } from "@/lib/catalog/types";

const available = (p: CatalogProduct) => p.totalAvailable > 0;

export default async function HomePage() {
  const [catalog, settings, categories, bestIds] = await Promise.all([
    getCatalog(),
    getStoreSettings(),
    getCategories(),
    getBestSellerIds(8),
  ]);

  const featured = catalog.filter((p) => p.isFeatured && available(p)).slice(0, 8);
  const news = catalog.filter((p) => p.isNew && available(p)).slice(0, 8);
  const best = bestIds
    .map((id) => catalog.find((p) => p.id === id))
    .filter((p): p is CatalogProduct => Boolean(p && available(p)))
    .slice(0, 4);
  const all = [...catalog].sort((a, b) => Number(available(b)) - Number(available(a)));

  return (
    <>
      <Hero settings={settings} categories={categories} products={catalog} />

      {/* Categorias */}
      {categories.length > 0 && (
        <section aria-label="Categorias" className="mx-auto max-w-6xl px-4 pt-8">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => {
              const count = catalog.filter((p) => p.categorySlug === c.slug).length;
              return (
                <li key={c.id}>
                  <Link
                    href={`/produtos?categoria=${c.slug}`}
                    className="group flex h-full items-center justify-between rounded-2xl border border-creme-300/15 bg-amora-700/40 px-4 py-4 transition-colors hover:border-creme-300/40 hover:bg-amora-700/70"
                  >
                    <span>
                      <span className="block font-display text-lg font-bold text-creme-50">{c.name}</span>
                      <span className="text-xs text-creme-100/60">
                        {count} {count === 1 ? "peça" : "peças"}
                      </span>
                    </span>
                    <span className="text-creme-300 transition-transform group-hover:translate-x-1" aria-hidden="true">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {catalog.length === 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-16 text-center">
            <AmoraIcon className="mx-auto h-10 w-10 text-berry" />
            <h2 className="mt-4 font-display text-2xl font-bold text-creme-50">Coleção chegando em breve</h2>
            <p className="mt-2 text-sm text-creme-100/70">Estamos preparando as peças. Volte logo 💜</p>
          </div>
        </section>
      ) : (
        <>
          {featured.length > 0 && (
            <Section id="destaques" eyebrow="Escolhidos para você" title="Destaques" href="/produtos">
              <ProductGrid products={featured} priorityCount={2} />
            </Section>
          )}

          {news.length > 0 && (
            <Section id="novidades" eyebrow="Acabou de chegar" title="Novidades" href="/produtos?ordem=novidades">
              <ProductGrid products={news} />
            </Section>
          )}

          {best.length > 0 && (
            <Section id="mais-vendidos" eyebrow="As queridinhas" title="Mais vendidos">
              <ProductGrid products={best} />
            </Section>
          )}

          <Section id="todos" eyebrow="Coleção completa" title="Todos os produtos" href="/produtos" hrefLabel="Filtrar">
            <ProductGrid products={all} />
          </Section>
        </>
      )}
    </>
  );
}
