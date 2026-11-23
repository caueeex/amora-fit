import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, adminButton } from "@/components/admin/ui";
import { PRODUCT_STATUS_INFO } from "@/lib/admin/product-status";
import { getAdminProduct, listCategoriesForAdmin } from "@/lib/admin/products";
import { ProductForm } from "../product-form";
import { DangerZone } from "./danger-zone";
import { ImageManager } from "./image-manager";

export const metadata: Metadata = { title: "Editar produto" };

export default function EditProductPage(props: PageProps<"/admin/produtos/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: PageProps<"/admin/produtos/[id]">) {
  const { id } = await params;
  const [product, categories, sp] = await Promise.all([getAdminProduct(id), listCategoriesForAdmin(), searchParams]);
  if (!product) notFound();
  const colors = [...new Set(product.variants.filter((v) => v.is_active).map((v) => v.color_name))];
  const info = PRODUCT_STATUS_INFO[product.status];

  return (
    <>
      <Link href="/admin/produtos" className="text-sm font-medium text-amora-700 hover:underline">
        ← Produtos
      </Link>
      <div className="mt-3">
        <PageHeader
          title={product.name}
          description={`${info.label} · ${info.hint}`}
          actions={
            product.status === "active" ? (
              <Link href={`/produto/${product.slug}`} target="_blank" className={adminButton("secondary")}>
                Ver na loja ↗
              </Link>
            ) : undefined
          }
        />
      </div>

      {sp.criado === "1" && (
        <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          ✓ Produto criado! Agora adicione as fotos abaixo{product.status === "draft" ? " e, quando estiver pronto, mude para “Publicado”." : "."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        <ImageManager productId={product.id} productName={product.name} images={product.images} colors={colors} />
        <ProductForm
          key={`${product.id}-${product.variants.map((v) => `${v.id}${v.is_active}${v.on_hand}`).join()}`}
          categories={categories}
          initial={product}
        />
        <DangerZone productId={product.id} status={product.status} hasOrders={product.has_orders} />
      </div>
    </>
  );
}
