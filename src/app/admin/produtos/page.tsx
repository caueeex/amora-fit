import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Card, PageHeader, adminButton } from "@/components/admin/ui";
import { PRODUCT_STATUS_INFO as STATUS_INFO } from "@/lib/admin/product-status";
import { listAdminProducts, listCategoriesForAdmin } from "@/lib/admin/products";
import { formatBRL } from "@/lib/domain/money";

export const metadata: Metadata = { title: "Produtos" };


function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default function AdminProductsPage(props: PageProps<"/admin/produtos">) {
  return (
    <>
      <PageHeader
        title="Produtos"
        description="Cadastre peças, variações de cor e tamanho, fotos e preços."
        actions={
          <Link href="/admin/produtos/novo" className={adminButton("primary")}>
            + Novo produto
          </Link>
        }
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-amora-100/60" aria-hidden="true" />}>
        <List {...props} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: PageProps<"/admin/produtos">) {
  const sp = await searchParams;
  const q = one(sp.q) ?? "";
  const status = one(sp.situacao) ?? "";
  const category = one(sp.categoria) ?? "";
  const [products, categories] = await Promise.all([listAdminProducts({ q, status, category }), listCategoriesForAdmin()]);

  return (
    <>
      <form method="get" className="mb-4 grid gap-2 rounded-2xl border border-amora-900/10 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="sr-only" htmlFor="q">
          Buscar produto
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Buscar pelo nome" className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm focus:border-amora-700 focus:outline-none focus:ring-2 focus:ring-amora-700/15" />
        <select name="situacao" defaultValue={status} aria-label="Situação" className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm">
          <option value="">Todas as situações</option>
          <option value="active">Publicados</option>
          <option value="draft">Rascunhos</option>
          <option value="archived">Arquivados</option>
        </select>
        <select name="categoria" defaultValue={category} aria-label="Categoria" className="min-h-10 rounded-xl border border-amora-900/15 px-3 text-sm">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={adminButton("primary")}>Filtrar</button>
      </form>

      {products.length === 0 ? (
        <Card className="py-12 text-center text-sm text-amora-900/60">
          Nenhum produto encontrado.{" "}
          <Link href="/admin/produtos/novo" className="font-semibold text-amora-700 hover:underline">
            Cadastrar o primeiro
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-2">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/produtos/${p.id}`}
                className="flex items-center gap-4 rounded-2xl border border-amora-900/10 bg-white p-3 transition-colors hover:border-amora-800/30 hover:bg-amora-100/15"
              >
                <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded-xl bg-amora-100/50">
                  {p.thumb ? <Image src={p.thumb} alt="" fill sizes="52px" className="object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-amora-900/40">sem foto</span>}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-amora-950">{p.name}</span>
                  <span className="text-xs text-amora-900/55">
                    {p.category ?? "Sem categoria"} · {p.variants} variação(ões)
                    {p.is_new && " · Lançamento"}
                    {p.is_featured && " · Destaque"}
                  </span>
                </span>
                <span className="hidden w-28 text-right text-sm sm:block">
                  {p.promo_price_cents ? (
                    <>
                      <span className="block font-semibold tabular-nums">{formatBRL(p.promo_price_cents)}</span>
                      <span className="text-xs tabular-nums text-amora-900/45 line-through">{formatBRL(p.price_cents)}</span>
                    </>
                  ) : (
                    <span className="font-semibold tabular-nums">{formatBRL(p.price_cents)}</span>
                  )}
                </span>
                <span className={`hidden w-24 text-right text-sm tabular-nums md:block ${p.available === 0 ? "text-red-700" : "text-amora-900/70"}`}>
                  {p.available === 0 ? "⚠ sem estoque" : `${p.available} disp.`}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_INFO[p.status].cls}`}>{STATUS_INFO[p.status].label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
