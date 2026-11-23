import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCategories } from "@/lib/catalog/queries";
import { CartButton } from "./cart-button";
import { GarmentIcon, SparkleIcon, TagIcon } from "./garment-icons";

function SearchForm({ id, className = "" }: { id: string; className?: string }) {
  return (
    <form action="/produtos" method="get" role="search" className={`flex ${className}`}>
      <label htmlFor={id} className="sr-only">
        Buscar produtos
      </label>
      <input
        id={id}
        name="q"
        type="search"
        placeholder="O que você está procurando?"
        maxLength={80}
        className="h-11 min-w-0 flex-1 rounded-l-full border border-r-0 border-creme-300/20 bg-amora-950/40 pl-5 pr-3 text-sm text-creme-50 placeholder:text-creme-100/45 transition-colors focus:border-creme-300 focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="grid h-11 w-12 shrink-0 place-items-center rounded-r-full bg-creme-300 text-amora-900 transition-colors hover:bg-creme-200"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

export async function StoreHeader() {
  const categories = await getCategories();

  const nav = [
    { href: "/produtos?ordem=novidades", label: "Novidades", icon: <SparkleIcon className="h-5 w-5" /> },
    ...categories.map((c) => ({
      href: `/produtos?categoria=${c.slug}`,
      label: c.name,
      icon: <GarmentIcon slug={c.slug} className="h-7 w-7" />,
    })),
    { href: "/produtos?oferta=1", label: "Ofertas", icon: <TagIcon className="h-5 w-5" />, accent: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-amora-800/95 backdrop-blur-md">
      {/* Faixa principal */}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:gap-8 md:py-4">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Amora Fit — início">
          <Logo variant="compact" />
        </Link>

        <SearchForm id="busca-desktop" className="hidden flex-1 md:flex md:max-w-xl md:mx-auto" />

        <nav className="ml-auto flex items-center gap-1 md:ml-0 md:gap-3" aria-label="Conta e carrinho">
          <Link
            href="/minha-conta"
            className="grid h-11 w-11 place-items-center rounded-full text-creme-100 transition-colors hover:bg-creme-300/10 hover:text-creme-300"
            aria-label="Minha conta"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.5-3.5 4.4-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
            </svg>
          </Link>
          <CartButton />
        </nav>
      </div>

      {/* Celular: busca + categorias deslizantes */}
      <div className="border-b border-creme-300/10 md:hidden">
        <div className="px-4 pb-3">
          <SearchForm id="busca-mobile" />
        </div>
        <ul className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Categorias">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
                  item.accent ? "border-creme-300/60 text-creme-300" : "border-creme-300/25 text-creme-100 hover:border-creme-300"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Desktop: barra de navegação com ícones */}
      <nav aria-label="Categorias" className="hidden border-y border-creme-300/10 bg-amora-950/50 md:block">
        <ul className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`group relative flex h-12 items-center gap-2 px-2 text-sm font-medium transition-colors ${
                  item.accent ? "text-creme-300" : "text-creme-100 hover:text-creme-300"
                }`}
              >
                <span className="opacity-80 transition-opacity group-hover:opacity-100">{item.icon}</span>
                {item.label}
                <span
                  className="absolute inset-x-2 bottom-0 h-0.5 origin-left scale-x-0 rounded-full bg-creme-300 transition-transform duration-300 group-hover:scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
