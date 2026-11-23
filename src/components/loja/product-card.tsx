import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog/types";
import { Price } from "./price";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority = false }: { product: CatalogProduct; priority?: boolean }) {
  const soldOut = product.totalAvailable === 0;
  const lowStock = !soldOut && product.totalAvailable <= 3;

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-creme-300/10 bg-amora-700/40 transition-[transform,border-color,box-shadow] duration-300 ease-[var(--ease-suave)] hover:-translate-y-1 hover:border-creme-300/30 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative">
        <ProductImage
          src={product.images[0]?.url}
          alt={product.images[0]?.alt ?? product.name}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          className={`aspect-[4/5] transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
        />
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {soldOut ? (
            <span className="rounded-full bg-tinta/80 px-2.5 py-1 text-[11px] font-semibold text-creme-100">Esgotado</span>
          ) : (
            product.isNew && (
              <span className="rounded-full bg-creme-300 px-2.5 py-1 text-[11px] font-bold text-amora-900">Novo</span>
            )
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {product.categoryName && (
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-creme-100/60">{product.categoryName}</span>
        )}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-creme-50 sm:text-base">{product.name}</h3>
        <div className="mt-auto pt-1">
          <Price priceCents={product.priceCents} promoPriceCents={product.promoPriceCents} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex -space-x-1" aria-label={`Cores: ${product.colors.map((c) => c.name).join(", ")}`}>
            {product.colors.slice(0, 5).map((c) => (
              <span
                key={c.name}
                title={c.name}
                className="h-4 w-4 rounded-full border-2 border-amora-700 ring-1 ring-creme-300/30"
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
          {lowStock && <span className="text-[11px] font-medium text-creme-300">Últimas peças</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: CatalogProduct[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
