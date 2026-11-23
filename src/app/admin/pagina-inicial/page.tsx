import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardTitle, PageHeader, adminButton } from "@/components/admin/ui";
import { listAdminCategories, listAdminSections } from "@/lib/admin/home";
import { CategoryManager } from "./category-manager";
import { SectionsList } from "./sections-list";

export const metadata: Metadata = { title: "Página inicial" };

export default function HomeEditorPage(props: PageProps<"/admin/pagina-inicial">) {
  return (
    <>
      <PageHeader
        title="Página inicial"
        description="Monte a home da loja: banners, vitrines, categorias e textos. As mudanças aparecem na loja ao salvar."
        actions={
          <Link href="/" target="_blank" className={adminButton("secondary")}>
            Ver loja ↗
          </Link>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <Content {...props} />
      </Suspense>
    </>
  );
}

async function Content({ searchParams }: PageProps<"/admin/pagina-inicial">) {
  const sp = await searchParams;
  const tab = sp.aba === "categorias" ? "categorias" : "secoes";
  const [sections, categories] = await Promise.all([listAdminSections(), listAdminCategories()]);

  return (
    <>
      <nav className="mb-4 flex gap-2" aria-label="Abas">
        {[
          ["secoes", "Seções da página"],
          ["categorias", "Categorias"],
        ].map(([id, label]) => (
          <Link
            key={id}
            href={id === "secoes" ? "/admin/pagina-inicial" : "/admin/pagina-inicial?aba=categorias"}
            aria-current={tab === id ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-medium ${tab === id ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900/80"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "categorias" ? (
        <CategoryManager categories={categories} />
      ) : sections === null ? (
        <Card>
          <CardTitle>Falta um passo no banco</CardTitle>
          <p className="text-sm text-amora-900/75">
            Para editar a página inicial, rode no SQL Editor do Supabase o arquivo{" "}
            <code className="rounded bg-amora-100/50 px-1">supabase/bundle/pendentes-0011-0012.sql</code>. Enquanto isso, a loja mostra a página inicial padrão.
          </p>
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-amora-900/60">A ordem abaixo é a ordem da página. Seções desligadas ou fora do período agendado não aparecem para as clientes.</p>
          <SectionsList sections={sections} />
        </>
      )}
    </>
  );
}
