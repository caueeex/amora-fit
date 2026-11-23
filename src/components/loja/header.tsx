import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCategories } from "@/lib/catalog/queries";
import { CartButton } from "./cart-button";

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/produtos" method="get" role="search" className={`relative ${className}`}>
      <label htmlFor="busca" className="sr-only">
        Buscar produtos
      </label>
      <input
        id="busca"
        name="q"
        type="search"
        placeholder="Buscar legging, top, conjunto…"
        maxLength={80}
        className="h-11 w-full rounded-full border border-creme-300/20 bg-amora-950/40 pl-11 pr-4 text-sm text-creme-50 placeholder:text-creme-100/45 transition-colors focus:border-creme-300 focus:outline-none"
      />
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-creme-100/60" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
    </form>
  );
}

export async function StoreHeader() {
  const categories = await getCategories();

  return (
    <header className="sticky top-0 z-40 border-b border-creme-300/10 bg-amora-800/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Amora Fit — início">
          <Logo variant="compact" />
        </Link>

        <SearchForm className="hidden flex-1 md:block md:max-w-md" />

        <nav className="ml-auto flex items-center gap-1" aria-label="Conta e carrinho">
          <Link
            href="/minha-conta"
            className="grid h-11 w-11 place-items-center rounded-full text-creme-100 transition-colors hover:bg-creme-300/10"
            aria-label="Minha conta"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-3.5 4.4-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
            </svg>
          </Link>
          <CartButton />
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
        <SearchForm />
      </div>

      <nav aria-label="Categorias" className="mx-auto max-w-6xl">
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 sm:justify-center">
          <li>
            <Link href="/produtos" className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-creme-300/25 px-4 text-sm text-creme-100 transition-colors hover:border-creme-300 hover:bg-creme-300/10">
              Todos
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/produtos?categoria=${c.slug}`}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-full border border-creme-300/25 px-4 text-sm text-creme-100 transition-colors hover:border-creme-300 hover:bg-creme-300/10"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
