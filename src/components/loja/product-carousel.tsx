"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Carrossel horizontal de cards: arrastar/rolar no celular, setas no desktop.
 * Os cards (Server Components) chegam prontos como children.
 */
export function ProductCarousel({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  const arrow =
    "absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-creme-300/25 bg-amora-900/85 text-creme-100 shadow-lg backdrop-blur transition-[opacity,background-color,color] hover:bg-creme-300 hover:text-amora-900 disabled:pointer-events-none disabled:opacity-0 md:grid";

  return (
    <div className="relative">
      <button type="button" onClick={() => scroll(-1)} disabled={edges.start} aria-label={`${label}: anteriores`} className={`${arrow} -left-5`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul
        ref={track}
        aria-label={label}
        className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3 pt-2 sm:gap-5"
      >
        {Children.map(children, (child) => (
          <li className="relative w-[44%] shrink-0 snap-start sm:w-[calc((100%-2*1.25rem)/3)] lg:w-[calc((100%-3*1.25rem)/4)]">{child}</li>
        ))}
      </ul>

      <button type="button" onClick={() => scroll(1)} disabled={edges.end} aria-label={`${label}: próximos`} className={`${arrow} -right-5`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
