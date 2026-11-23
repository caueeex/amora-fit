import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductGrid } from "@/components/loja/product-card";
import { Section } from "@/components/loja/section";
import { relatedProducts } from "@/lib/catalog/filters";
import { getCatalog, getProductBySlug } from "@/lib/catalog/queries";
import { Gallery } from "./gallery";
import { PurchasePanel } from "./purchase-panel";

export async function generateMetadata({ params }: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produto não encontrado" };
  return {
    title: product.name,
    description: product.description.slice(0, 160) || undefined,
    openGraph: product.images[0] ? { images: [product.images[0].url] } : undefined,
  };
}

export default function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

async function ProductContent({ params }: { params: PageProps<"/produto/[slug]">["params"] }) {
  const { slug } = await params;
  const [product, catalog] = await Promise.all([getProductBySlug(slug), getCatalog()]);
  if (!product) notFound();
  const related = relatedProducts(catalog, product, 4);

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <nav aria-label="Trilha" className="mb-4 text-xs text-creme-100/60">
          <Link href="/" className="hover:text-creme-300">
            Início
          </Link>
          {product.categorySlug && (
            <>
              {" / "}
              <Link href={`/produtos?categoria=${product.categorySlug}`} className="hover:text-creme-300">
                {product.categoryName}
              </Link>
            </>
          )}
          {" / "}
          <span className="text-creme-100/80">{product.name}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2 md:gap-10">
          <Gallery images={product.images} name={product.name} />

          <div className="flex flex-col gap-5">
            <header>
              {product.categoryName && (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-creme-300/80">{product.categoryName}</p>
              )}
              <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-creme-50 sm:text-4xl">{product.name}</h1>
            </header>

            <PurchasePanel product={product} />

            {product.description && (
              <section aria-labelledby="descricao" className="border-t border-creme-300/10 pt-5">
                <h2 id="descricao" className="mb-2 text-sm font-semibold text-creme-300">
                  Descrição
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-creme-100/85">{product.description}</p>
              </section>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <Section id="relacionados" eyebrow="Combine com" title="Você também vai gostar">
          <ProductGrid products={related} />
        </Section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl animate-pulse gap-8 px-4 pt-10 md:grid-cols-2" aria-hidden="true">
      <div className="aspect-[4/5] rounded-[var(--radius-card)] bg-creme-300/10" />
      <div className="flex flex-col gap-4">
        <div className="h-4 w-24 rounded bg-creme-300/10" />
        <div className="h-10 w-3/4 rounded-lg bg-creme-300/10" />
        <div className="h-8 w-32 rounded-lg bg-creme-300/10" />
        <div className="h-24 rounded-xl bg-creme-300/10" />
        <div className="h-12 rounded-full bg-creme-300/15" />
      </div>
    </div>
  );
}
