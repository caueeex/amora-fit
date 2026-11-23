import { AmoraIcon } from "@/components/brand/logo";
import { BannerCarousel } from "@/components/loja/banner-carousel";
import { CategoryCarousel } from "@/components/loja/category-carousel";
import { Hero } from "@/components/loja/hero";
import { DoubleBanner, ImageTiles, LinkCards, TextBlock } from "@/components/loja/home-blocks";
import { VideoShowcase } from "@/components/loja/video-showcase";
import { ProductRow } from "@/components/loja/product-card";
import { Section } from "@/components/loja/section";
import { storagePublicUrl } from "@/lib/catalog/normalize";
import { getBestSellerIds, getCatalog, getCategories, getHomeSections, getStoreSettings } from "@/lib/catalog/queries";
import type { CatalogProduct, Category } from "@/lib/catalog/types";
import { publicEnv } from "@/lib/env";
import { DEFAULT_SECTIONS, type HomeSection } from "@/lib/home/sections";

const available = (p: CatalogProduct) => p.totalAvailable > 0;
const asset = (path: string | null | undefined) => (path ? storagePublicUrl(publicEnv.supabaseUrl, "store-assets", path) : null);
const videoUrl = (path: string | null | undefined) => (path ? storagePublicUrl(publicEnv.supabaseUrl, "store-videos", path) : null);

/** Produtos de uma vitrine conforme a origem configurada no painel. */
function productsFor(s: Extract<HomeSection, { type: "products" }>, catalog: CatalogProduct[], bestIds: string[]): CatalogProduct[] {
  const c = s.config;
  let list: CatalogProduct[];
  switch (c.source) {
    case "featured":
      list = catalog.filter((p) => p.isFeatured && available(p));
      break;
    case "new":
      list = catalog.filter((p) => p.isNew && available(p));
      break;
    case "best":
      list = bestIds.map((id) => catalog.find((p) => p.id === id)).filter((p): p is CatalogProduct => Boolean(p && available(p)));
      break;
    case "sale":
      list = catalog.filter((p) => p.promoPriceCents !== null && available(p));
      break;
    case "category":
      list = catalog.filter((p) => p.categorySlug === c.category_slug).sort((a, b) => Number(available(b)) - Number(available(a)));
      break;
    case "manual":
      list = (c.product_ids ?? []).map((id) => catalog.find((p) => p.id === id)).filter((p): p is CatalogProduct => Boolean(p));
      break;
    default:
      list = [...catalog].sort((a, b) => Number(available(b)) - Number(available(a)));
  }
  return list.slice(0, c.limit);
}

function categoryItems(categories: Category[], catalog: CatalogProduct[]) {
  const news = catalog.filter((p) => p.isNew && available(p));
  return [
    ...(news.length > 0 ? [{ key: "novidades", href: "/produtos?ordem=novidades", label: "Novidades", imageUrl: news[0].images[0]?.url ?? null, iconSlug: "novidades" }] : []),
    ...categories.map((c) => ({
      key: c.id,
      href: `/produtos?categoria=${c.slug}`,
      label: c.name,
      imageUrl: c.imageUrl ?? catalog.find((p) => p.categorySlug === c.slug && p.images[0])?.images[0]?.url ?? null,
      iconSlug: c.slug,
    })),
  ];
}

export default async function HomePage() {
  const [catalog, settings, categories, bestIds, sectionsFromDb] = await Promise.all([
    getCatalog(),
    getStoreSettings(),
    getCategories(),
    getBestSellerIds(12),
    getHomeSections(),
  ]);
  // Sem a tabela no banco (migration pendente), usa a home padrão.
  const sections = sectionsFromDb ?? DEFAULT_SECTIONS;
  // A primeira vitrine carrega as 2 primeiras fotos com prioridade.
  const firstProductSectionId = sections.find((s) => s.type === "products")?.id;

  return (
    <>
      {sections.map((s) => {
        switch (s.type) {
          case "hero":
            return <Hero key={s.id} settings={settings} categories={categories} products={catalog} />;

          case "banners":
            return (
              <BannerCarousel
                key={s.id}
                autoplaySeconds={s.config.autoplay_seconds}
                slides={s.config.slides.map((sl) => ({
                  image: asset(sl.image_path),
                  mobileImage: asset(sl.mobile_image_path),
                  video: videoUrl(sl.video_path),
                  title: sl.title,
                  subtitle: sl.subtitle,
                  ctaLabel: sl.cta_label,
                  ctaHref: sl.cta_href,
                  align: sl.align,
                }))}
              />
            );

          case "categories":
            return categories.length > 0 ? (
              <CategoryCarousel
                key={s.id}
                title={s.title ? <h2 className="mb-6 text-center font-display text-2xl font-bold text-creme-50 sm:text-3xl">{s.title}</h2> : null}
                items={categoryItems(categories, catalog)}
              />
            ) : null;

          case "products": {
            if (catalog.length === 0) return null;
            const list = productsFor(s, catalog, bestIds);
            if (list.length === 0) return null;
            const priority = s.id === firstProductSectionId ? 2 : 0;
            return (
              <Section key={s.id} id={`secao-${s.id}`} eyebrow={s.config.eyebrow || undefined} title={s.title} href={s.config.link_href || undefined} hrefLabel="Ver todos">
                <ProductRow products={list} label={s.title || "Produtos"} priorityCount={priority} />
              </Section>
            );
          }

          case "double_banner":
            return (
              <DoubleBanner
                key={s.id}
                items={s.config.items.map((it) => ({ image: asset(it.image_path), title: it.title, subtitle: it.subtitle, href: it.href }))}
              />
            );

          case "text":
            return <TextBlock key={s.id} eyebrow={s.config.eyebrow} title={s.title} body={s.config.body} align={s.config.align} />;

          case "image_tiles":
            return (
              <ImageTiles
                key={s.id}
                title={s.title}
                items={s.config.items.map((it) => ({ image: asset(it.image_path), label: it.label, ctaLabel: it.cta_label, href: it.href }))}
              />
            );

          case "link_cards":
            return <LinkCards key={s.id} title={s.title} items={s.config.items} />;

          case "videos": {
            const items = s.config.items
              .filter((it) => it.video_path)
              .map((it) => {
                const p = it.product_id ? catalog.find((c) => c.id === it.product_id) : undefined;
                return {
                  video: videoUrl(it.video_path)!,
                  poster: asset(it.poster_path),
                  caption: it.caption,
                  product: p
                    ? { slug: p.slug, name: p.name, priceCents: p.priceCents, promoPriceCents: p.promoPriceCents, image: p.images[0]?.url ?? null, isNew: p.isNew }
                    : null,
                };
              });
            return items.length ? <VideoShowcase key={s.id} title={s.title} items={items} /> : null;
          }

          default:
            return null;
        }
      })}

      {catalog.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-12">
          <div className="rounded-[var(--radius-card)] border border-dashed border-creme-300/25 px-6 py-16 text-center">
            <AmoraIcon className="mx-auto h-10 w-10 text-berry" />
            <h2 className="mt-4 font-display text-2xl font-bold text-creme-50">Coleção chegando em breve</h2>
            <p className="mt-2 text-sm text-creme-100/70">Estamos preparando as peças. Volte logo 💜</p>
          </div>
        </section>
      )}
    </>
  );
}
