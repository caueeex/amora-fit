"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { splitHighlight, type SearchResult } from "@/lib/catalog/suggest";
import { formatBRL } from "@/lib/domain/money";
import { ProductImage } from "./product-image";

/**
 * Busca com sugestões enquanto digita (sugestões + produtos).
 * Sem JavaScript, continua funcionando como formulário GET para /produtos.
 */
export function SearchBox({ className = "" }: { className?: string }) {
  const router = useRouter();
  const uid = useId();
  const inputId = `${uid}-busca`;
  const listId = `${uid}-sugestoes`;
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  // Busca com debounce + cancelamento da requisição anterior.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          setResult((await res.json()) as SearchResult);
          setActive(-1);
        }
      } catch {
        // abortada ou offline: mantém o último resultado
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  // Fecha ao clicar fora.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const q = query.trim();
  const visible = open && q.length >= 2 && result !== null && result.query.length >= 2;
  const options = visible
    ? [
        ...result.suggestions.map((s) => s.href),
        ...result.products.map((p) => `/produto/${p.slug}`),
        `/produtos?q=${encodeURIComponent(q)}`,
      ]
    : [];
  const searchAllIndex = options.length - 1;

  function go(href: string) {
    setOpen(false);
    input.current?.blur();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      go(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${uid}-opt-${i}`;
  const suggestionsCount = result?.suggestions.length ?? 0;

  return (
    <div ref={wrapper} className={`relative ${className}`}>
      <form
        action="/produtos"
        method="get"
        role="search"
        className="flex"
        onSubmit={(e) => {
          if (!q) e.preventDefault();
          setOpen(false);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Buscar produtos
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            ref={input}
            id={inputId}
            name="q"
            type="search"
            autoComplete="off"
            placeholder="O que você está procurando?"
            maxLength={80}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={visible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={visible && active >= 0 ? optionId(active) : undefined}
            className={`h-11 w-full border border-r-0 border-creme-300/20 bg-amora-950/40 pl-5 pr-10 text-sm text-creme-50 placeholder:text-creme-100/45 transition-colors focus:border-creme-300 focus:outline-none ${
              visible ? "rounded-tl-[1.375rem]" : "rounded-l-full"
            }`}
          />
          {query && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => {
                setQuery("");
                setResult(null);
                input.current?.focus();
              }}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-creme-100/60 transition-colors hover:bg-creme-300/10 hover:text-creme-300"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          aria-label="Buscar"
          className={`grid h-11 w-12 shrink-0 place-items-center bg-creme-300 text-amora-900 transition-colors hover:bg-creme-200 ${visible ? "rounded-tr-[1.375rem]" : "rounded-r-full"}`}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </form>

      {visible && (
        <div
          id={listId}
          role="listbox"
          aria-label="Sugestões de busca"
          className="absolute inset-x-0 top-full z-50 overflow-hidden rounded-b-[1.375rem] border border-t-0 border-creme-300/20 bg-amora-900 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6)] animate-[subir_180ms_var(--ease-suave)]"
        >
          {result.suggestions.length === 0 && result.products.length === 0 ? (
            <p className="px-5 py-6 text-sm text-creme-100/70">
              Nenhum produto encontrado para <strong className="text-creme-50">“{result.query}”</strong>.
            </p>
          ) : (
            <div className="grid md:grid-cols-[minmax(0,13rem)_1fr]">
              {result.suggestions.length > 0 && (
                <div className="border-b border-creme-300/10 py-3 md:border-b-0 md:border-r">
                  <p className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-creme-100/50">Sugestões</p>
                  <ul>
                    {result.suggestions.map((s, i) => {
                      const [before, typed, after] = splitHighlight(s.label, result.query);
                      return (
                        <li key={s.href + s.label}>
                          <Link
                            id={optionId(i)}
                            role="option"
                            aria-selected={active === i}
                            href={s.href}
                            onClick={() => setOpen(false)}
                            className={`block px-5 py-2 text-sm text-creme-100 transition-colors hover:bg-creme-300/10 ${active === i ? "bg-creme-300/10" : ""}`}
                          >
                            {before}
                            <span className="font-normal">{typed}</span>
                            <strong className="font-semibold text-creme-50">{after}</strong>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="py-3">
                <p className="px-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-creme-100/50">Produtos</p>
                {result.products.length === 0 ? (
                  <p className="px-5 py-2 text-sm text-creme-100/60">Nenhum produto com esse nome.</p>
                ) : (
                  <ul>
                    {result.products.map((p, j) => {
                      const i = suggestionsCount + j;
                      return (
                        <li key={p.slug}>
                          <Link
                            id={optionId(i)}
                            role="option"
                            aria-selected={active === i}
                            href={`/produto/${p.slug}`}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-4 px-5 py-2 transition-colors hover:bg-creme-300/10 ${active === i ? "bg-creme-300/10" : ""}`}
                          >
                            <ProductImage src={p.imageUrl} alt="" sizes="48px" className="h-16 w-12 shrink-0 rounded-lg [&_span]:hidden" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-creme-50">{p.name}</span>
                              <span className="text-sm font-semibold text-creme-300">{formatBRL(p.promoPriceCents ?? p.priceCents)}</span>
                              {p.promoPriceCents !== null && (
                                <span className="ml-2 text-xs text-creme-100/50 line-through">{formatBRL(p.priceCents)}</span>
                              )}
                              {p.soldOut && <span className="ml-2 text-xs text-creme-100/60">Esgotado</span>}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          <Link
            id={optionId(searchAllIndex)}
            role="option"
            aria-selected={active === searchAllIndex}
            href={`/produtos?q=${encodeURIComponent(q)}`}
            onClick={() => setOpen(false)}
            className={`flex items-center justify-center gap-2 bg-creme-300 px-5 py-3 text-sm font-semibold text-amora-900 transition-colors hover:bg-creme-200 ${
              active === searchAllIndex ? "bg-creme-200" : ""
            }`}
          >
            {result.total > 0 ? `Ver ${result.total} ${result.total === 1 ? "resultado" : "resultados"} para “${q}”` : `Pesquisar “${q}”`}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
