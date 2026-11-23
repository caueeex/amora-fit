import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getCategories, getStoreSettings } from "@/lib/catalog/queries";
import { CartButton } from "./cart-button";
import { GarmentIcon, SparkleIcon, TagIcon } from "./garment-icons";
import { MobileHeader, type MobileNavItem } from "./mobile-header";
import { SearchBox } from "./search-box";

export async function StoreHeader() {
  const [categories, settings] = await Promise.all([getCategories(), getStoreSettings()]);

  const nav = [
    { href: "/produtos?ordem=novidades", label: "Novidades", icon: <SparkleIcon className="h-5 w-5" /> },
    ...categories.map((c) => ({
      href: `/produtos?categoria=${c.slug}`,
      label: c.name,
      icon: <GarmentIcon slug={c.slug} className="h-7 w-7" />,
    })),
    { href: "/produtos?oferta=1", label: "Ofertas", icon: <TagIcon className="h-5 w-5" />, accent: true },
  ];

  const mobileNav: MobileNavItem[] = [
    { href: "/produtos?ordem=novidades", label: "Novidades", icon: "novidades" },
    ...categories.map((c) => ({ href: `/produtos?categoria=${c.slug}`, label: c.name, icon: c.slug })),
    { href: "/produtos?oferta=1", label: "Ofertas", icon: "ofertas", accent: true },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-creme-300/10 bg-amora-800/95 backdrop-blur-md md:border-b-0">
      {/* Celular: menu + busca | logo | carrinho */}
      <MobileHeader nav={mobileNav} logoUrl={settings.logoUrl} storeName={settings.storeName} />

      {/* Desktop: faixa principal */}
      <div className="mx-auto hidden max-w-6xl items-center gap-8 px-4 py-4 md:flex">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Amora Fit — início">
          <Logo variant="compact" src={settings.logoUrl} alt={settings.storeName} />
        </Link>

        <SearchBox className="mx-auto max-w-xl flex-1" />

        <nav className="flex items-center gap-3" aria-label="Conta e carrinho">
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
