"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { GarmentIcon } from "./garment-icons";

export type CategoryBubble = {
  key: string;
  href: string;
  label: string;
  /** Foto da categoria ou de um produto dela; sem foto, mostra a ilustração. */
  imageUrl: string | null;
  iconSlug: string;
};

function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Categorias anteriores" : "Próximas categorias"}
      className="absolute top-[3.5rem] z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-creme-300/25 bg-amora-900/80 text-creme-100 shadow-lg backdrop-blur transition-[opacity,background-color] hover:bg-creme-300 hover:text-amora-900 disabled:pointer-events-none disabled:opacity-0 sm:grid sm:top-[4.25rem] data-[dir=next]:right-0 data-[dir=prev]:left-0"
      data-dir={dir}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        {dir === "prev" ? <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
    </button>
  );
}

export function CategoryCarousel({ items, title }: { items: CategoryBubble[]; title: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

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
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section aria-label="Categorias" className="mx-auto max-w-6xl px-4 pt-10">
      {title}
      <div className="relative">
        <Arrow dir="prev" disabled={edges.start} onClick={() => scroll(-1)} />
        <ul
          ref={track}
          className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:scroll-px-14 sm:gap-7 sm:px-14 lg:justify-center-safe"
        >
          {items.map((c, i) => (
            <li key={c.key} className="relative snap-start">
              <Link href={c.href} className="group flex w-28 flex-col items-center gap-3 text-center sm:w-36">
                <span className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-amora-700 text-creme-200 transition-colors duration-300 group-hover:bg-amora-600 group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-creme-300 sm:h-36 sm:w-36">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt=""
                      fill
                      sizes="144px"
                      priority={i < 4}
                      className="object-cover transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-105"
                    />
                  ) : (
                    <GarmentIcon slug={c.iconSlug} className="h-16 w-16 transition-transform duration-500 ease-[var(--ease-suave)] group-hover:scale-105 sm:h-20 sm:w-20" />
                  )}
                </span>
                <span className="text-sm font-medium text-creme-50 transition-colors group-hover:text-creme-300 sm:text-base">{c.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Arrow dir="next" disabled={edges.end} onClick={() => scroll(1)} />
      </div>
    </section>
  );
}
