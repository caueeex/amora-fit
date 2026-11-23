import { AmoraIcon } from "@/components/brand/logo";
import { CategoryCarousel } from "@/components/loja/category-carousel";
import { Hero } from "@/components/loja/hero";
import { ProductRow } from "@/components/loja/product-card";
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

      {/* Categorias em círculos (carrossel) */}
      {categories.length > 0 && (
        <CategoryCarousel
          title={
            <h2 className="mb-6 text-center font-display text-2xl font-bold text-creme-50 sm:text-3xl">Categorias</h2>
          }
          items={[
            ...(news.length > 0
              ? [{ key: "novidades", href: "/produtos?ordem=novidades", label: "Novidades", imageUrl: news[0].images[0]?.url ?? null, iconSlug: "novidades" }]
              : []),
            ...categories.map((c) => {
              const inCategory = catalog.filter((p) => p.categorySlug === c.slug);
              return {
                key: c.id,
                href: `/produtos?categoria=${c.slug}`,
                label: c.name,
                imageUrl: c.imageUrl ?? inCategory.find((p) => p.images[0])?.images[0]?.url ?? null,
                iconSlug: c.slug,
              };
            }),
          ]}
        />
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
              <ProductRow products={featured} label="Destaques" priorityCount={2} />
            </Section>
          )}

          {news.length > 0 && (
            <Section id="novidades" eyebrow="Acabou de chegar" title="Novidades" href="/produtos?ordem=novidades">
              <ProductRow products={news} label="Novidades" />
            </Section>
          )}

          {best.length > 0 && (
            <Section id="mais-vendidos" eyebrow="As queridinhas" title="Mais vendidos">
              <ProductRow products={best} label="Mais vendidos" />
            </Section>
          )}

          <Section id="todos" eyebrow="Coleção completa" title="Todos os produtos" href="/produtos" hrefLabel="Ver todos">
            <ProductRow products={all.slice(0, 16)} label="Todos os produtos" />
          </Section>
        </>
      )}
    </>
  );
}
