"use client";

import { useState, type ReactNode } from "react";

/** No celular os filtros ficam recolhidos atrás de um botão; no desktop, sempre visíveis. */
export function FilterToggle({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 lg:sticky lg:top-40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="painel-filtros"
        className="flex min-h-12 w-full items-center justify-between px-4 font-semibold text-creme-50 lg:cursor-default"
      >
        <span>
          Filtros
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-creme-300 px-2 py-0.5 text-xs font-bold text-amora-900">{activeCount}</span>
          )}
        </span>
        <span className={`text-creme-300 transition-transform lg:hidden ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      <div id="painel-filtros" className={open ? "block" : "hidden lg:block"}>
        {children}
      </div>
    </div>
  );
}
