"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/logo";
import { CartButton } from "./cart-button";
import { GarmentIcon, SparkleIcon, TagIcon } from "./garment-icons";
import { SearchBox } from "./search-box";

export type MobileNavItem = { href: string; label: string; icon: string; accent?: boolean };

function NavIcon({ icon }: { icon: string }) {
  if (icon === "novidades") return <SparkleIcon className="h-5 w-5" />;
  if (icon === "ofertas") return <TagIcon className="h-5 w-5" />;
  return <GarmentIcon slug={icon} className="h-6 w-6" />;
}

/** Trava a rolagem da página enquanto um painel está aberto e fecha com Esc. */
function useOverlay(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
}

const iconBtn = "grid h-11 w-11 place-items-center rounded-full text-creme-100 transition-colors hover:bg-creme-300/10 active:bg-creme-300/15";

export function MobileHeader({ nav, logoUrl, storeName }: { nav: MobileNavItem[]; logoUrl?: string | null; storeName?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  // Portais só existem no navegador.
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const closeMenu = () => setMenuOpen(false);
  useOverlay(menuOpen, closeMenu);

  useEffect(() => {
    if (menuOpen) closeBtn.current?.focus();
  }, [menuOpen]);

  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-2 py-2 md:hidden">
        <div className="flex items-center">
          <button type="button" className={iconBtn} aria-label="Abrir menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <Link href="/" className="rounded-lg px-2" aria-label="Amora Fit — início">
          <Logo variant="compact" src={logoUrl} alt={storeName} />
        </Link>
        <div className="flex justify-end">
          <CartButton />
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <SearchBox />
      </div>

      {mounted &&
        createPortal(
          <>
            {/* Menu lateral */}
            {menuOpen && (
              <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                <button type="button" className="absolute inset-0 bg-tinta/60 backdrop-blur-sm animate-[aparecer_200ms_ease-out]" aria-label="Fechar menu" onClick={closeMenu} />
                <nav className="relative flex h-full w-[86%] max-w-sm flex-col overflow-y-auto bg-amora-800 shadow-2xl animate-[deslizar_260ms_var(--ease-suave)]">
                  <div className="flex items-center justify-between border-b border-creme-300/10 px-5 py-4">
                    <Link href="/" onClick={closeMenu} aria-label="Amora Fit — início">
                      <Logo variant="compact" src={logoUrl} alt={storeName} />
                    </Link>
                    <button ref={closeBtn} type="button" onClick={closeMenu} className={iconBtn} aria-label="Fechar menu">
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 px-5 pt-5">
                    <Link href="/minha-conta" onClick={closeMenu} className="flex items-center gap-2 rounded-xl bg-amora-700 px-3 py-3 text-sm text-creme-50 transition-colors hover:bg-amora-600">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c1.5-3.5 4.4-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
                      </svg>
                      Minha conta
                    </Link>
                    <Link href="/minha-conta#pedidos" onClick={closeMenu} className="flex items-center gap-2 rounded-xl bg-amora-700 px-3 py-3 text-sm text-creme-50 transition-colors hover:bg-amora-600">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                        <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" strokeLinejoin="round" />
                        <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" strokeLinejoin="round" />
                      </svg>
                      Meus pedidos
                    </Link>
                  </div>

                  <p className="px-5 pb-1 pt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-creme-100/50">Produtos</p>
                  <ul className="px-5 pb-8">
                    {nav.map((item) => (
                      <li key={item.href} className="border-b border-creme-300/10 last:border-b-0">
                        <Link
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex min-h-14 items-center gap-3 text-[15px] font-medium tracking-wide transition-colors ${
                            item.accent ? "text-creme-300" : "text-creme-50 hover:text-creme-300"
                          }`}
                        >
                          <span className="grid w-7 place-items-center opacity-85">
                            <NavIcon icon={item.icon} />
                          </span>
                          <span className="uppercase">{item.label}</span>
                          <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-creme-100/40" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}
          </>,
          document.body,
        )}
    </>
  );
}
