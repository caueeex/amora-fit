import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { getAdminSection, listAdminCategories, listProductsForPicker } from "@/lib/admin/home";
import { publicEnv } from "@/lib/env";
import { SECTION_LABEL } from "@/lib/home/sections";
import { SectionEditor } from "./section-editor";

export const metadata: Metadata = { title: "Editar seção" };

export default function EditSectionPage(props: PageProps<"/admin/pagina-inicial/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ params, searchParams }: PageProps<"/admin/pagina-inicial/[id]">) {
  const { id } = await params;
  const [section, products, categories, sp] = await Promise.all([getAdminSection(id), listProductsForPicker(), listAdminCategories(), searchParams]);
  if (!section) notFound();

  return (
    <>
      <Link href="/admin/pagina-inicial" className="text-sm font-medium text-amora-700 hover:underline">
        ← Página inicial
      </Link>
      <div className="mt-3">
        <PageHeader title={section.title || SECTION_LABEL[section.type].label} description={SECTION_LABEL[section.type].hint} />
      </div>
      {sp.nova === "1" && (
        <p className="mb-4 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900" role="status">
          Seção criada{section.is_active ? "" : " (desligada)"}. Preencha e marque “Seção ativa” quando quiser que apareça na loja.
        </p>
      )}
      <SectionEditor
        section={section}
        assetBase={`${publicEnv.supabaseUrl}/storage/v1/object/public/store-assets`}
        products={products}
        categories={categories.filter((c) => c.is_active).map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </>
  );
}
