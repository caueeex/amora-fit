import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { listCategoriesForAdmin } from "@/lib/admin/products";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };

export default function NewProductPage() {
  return (
    <>
      <Link href="/admin/produtos" className="text-sm font-medium text-amora-700 hover:underline">
        ← Produtos
      </Link>
      <div className="mt-3">
        <PageHeader title="Novo produto" description="Depois de criar, você poderá adicionar as fotos." />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <Form />
      </Suspense>
    </>
  );
}

async function Form() {
  const categories = await listCategoriesForAdmin();
  return (
    <ProductForm
      categories={categories}
      initial={{ name: "", slug: "", description: "", category_id: null, price_cents: null, promo_price_cents: null, status: "draft", is_new: true, is_featured: false, variants: [] }}
    />
  );
}
