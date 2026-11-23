"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { Logo } from "@/components/brand/logo";

type Item = { href: string; label: string; icon: ReactNode; soon?: boolean };

const ic = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ITEMS: Item[] = [
  { href: "/admin", label: "Dashboard", icon: ic(<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="4.5" rx="1.5" /><rect x="13.5" y="11" width="7" height="9.5" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /></>) },
  { href: "/admin/pedidos", label: "Pedidos", icon: ic(<><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>) },
  { href: "/admin/produtos", label: "Produtos", icon: ic(<><path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>) },
  { href: "/admin/estoque", label: "Estoque", icon: ic(<><path d="M4 20V9l8-5 8 5v11" /><path d="M8 20v-6h8v6" /></>) },
  { href: "/admin/clientes", label: "Clientes", icon: ic(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.2 2.2 3.5 5" /></>) },
  { href: "/admin/pagina-inicial", label: "Página inicial", icon: ic(<><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 9h17M8 13h8M8 16.5h5" /></>) },
  { href: "/admin/configuracoes", label: "Configurações", icon: ic(<><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></>) },
];

function NavList({ pending, onNavigate }: { pending: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        if (item.soon) {
          return (
            <li key={item.href}>
              <span className="flex min-h-11 cursor-not-allowed items-center gap-3 rounded-xl px-3 text-sm text-creme-100/35" title="Em breve">
                {item.icon}
                {item.label}
                <span className="ml-auto rounded-full bg-creme-100/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">em breve</span>
              </span>
            </li>
          );
        }
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active ? "bg-creme-300 text-amora-900" : "text-creme-100/85 hover:bg-creme-100/10 hover:text-creme-50"
              }`}
            >
              {item.icon}
              {item.label}
              {item.href === "/admin/pedidos" && pending > 0 && (
                <span className={`ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold ${active ? "bg-amora-800 text-creme-50" : "bg-creme-300 text-amora-900"}`}>
                  {pending}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ name }: { name: string }) {
  return (
    <div className="mt-auto flex flex-col gap-1 border-t border-creme-100/10 pt-4">
      <Link href="/" target="_blank" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-creme-100/80 hover:bg-creme-100/10 hover:text-creme-50">
        {ic(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>)}
        Ver loja
      </Link>
      <form action={signOutAction}>
        <button className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-creme-100/80 hover:bg-creme-100/10 hover:text-creme-50">
          {ic(<><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 16l-4-4 4-4M6 12h10" /></>)}
          Sair <span className="ml-auto truncate text-xs text-creme-100/45">{name}</span>
        </button>
      </form>
    </div>
  );
}

export function AdminNav({ pending, name }: { pending: number; name: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Desktop: barra lateral fixa */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 bg-amora-900 px-4 py-6 lg:flex">
        <Link href="/admin" className="px-3">
          <Logo variant="compact" />
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.25em] text-creme-100/50">Painel</span>
        </Link>
        <nav aria-label="Painel administrativo">
          <NavList pending={pending} />
        </nav>
        <Footer name={name} />
      </aside>

      {/* Celular/tablet: barra superior + gaveta */}
      <div className="sticky top-0 z-40 flex items-center justify-between bg-amora-900 px-3 py-2 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full text-creme-100 hover:bg-creme-100/10" aria-label="Abrir menu do painel">
          {ic(<path d="M4 7h16M4 12h16M4 17h16" />)}
        </button>
        <Link href="/admin" aria-label="Painel">
          <Logo variant="compact" />
        </Link>
        <Link href="/admin/pedidos" className="relative grid h-11 w-11 place-items-center rounded-full text-creme-100 hover:bg-creme-100/10" aria-label={`Pedidos${pending ? `, ${pending} novos` : ""}`}>
          {ic(<><path d="M5 7h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 7Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>)}
          {pending > 0 && <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-creme-300 px-1 text-[11px] font-bold text-amora-900">{pending}</span>}
        </Link>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu do painel">
          <button type="button" className="absolute inset-0 bg-tinta/60 animate-[aparecer_200ms_ease-out]" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <nav key={pathname} className="relative flex h-full w-72 flex-col gap-6 bg-amora-900 px-4 py-6 animate-[deslizar_240ms_var(--ease-suave)]">
            <Logo variant="compact" className="px-3" />
            <NavList pending={pending} onNavigate={() => setOpen(false)} />
            <Footer name={name} />
          </nav>
        </div>
      )}
    </>
  );
}
