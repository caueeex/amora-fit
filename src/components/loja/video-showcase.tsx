"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatBRL } from "@/lib/domain/money";
import { ProductCarousel } from "./product-carousel";
import { ProductImage } from "./product-image";

export type VideoCard = {
  video: string;
  poster: string | null;
  caption: string;
  product: { slug: string; name: string; priceCents: number; promoPriceCents: number | null; image: string | null; isNew: boolean } | null;
};

/**
 * Vídeo que só carrega/toca quando está visível (economiza dados no celular),
 * sem som, em repetição. Respeita "reduzir movimento" (fica parado no 1º quadro).
 */
function LazyVideo({ src, poster }: { src: string; poster: string | null }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!v.src) v.src = src;
          if (!reduce) void v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return <video ref={ref} poster={poster ?? undefined} muted loop playsInline preload="none" className="absolute inset-0 h-full w-full object-cover" aria-hidden="true" />;
}

export function VideoShowcase({ title, items }: { title: string; items: VideoCard[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      {title && (
        <h2 className="mb-6 whitespace-pre-line text-center font-display text-2xl font-bold uppercase leading-tight tracking-wide text-creme-50 sm:text-3xl">
          {title.replace(/\.\s+/g, ".\n")}
        </h2>
      )}
      <ProductCarousel label={title || "Vídeos"}>
        {items.map((it, i) => (
          <div key={i} className="relative aspect-[9/16] overflow-hidden rounded-[var(--radius-card)] bg-amora-900">
            <LazyVideo src={it.video} poster={it.poster} />
            {it.product?.isNew && <span className="absolute left-3 top-3 rounded-full bg-creme-50 px-2.5 py-1 text-[11px] font-bold uppercase text-amora-900">Novo</span>}
            {it.caption && !it.product && (
              <p className="absolute inset-x-3 bottom-3 rounded-xl bg-tinta/60 px-3 py-2 text-sm text-creme-50 backdrop-blur">{it.caption}</p>
            )}
            {it.product && (
              <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-creme-50/95 p-2.5 text-amora-950 shadow-lg backdrop-blur">
                <div className="flex items-center gap-2.5">
                  <ProductImage src={it.product.image} alt="" sizes="40px" className="h-12 w-10 shrink-0 rounded-md [&_span]:hidden" />
                  <div className="min-w-0 text-xs">
                    <p className="truncate font-semibold uppercase">{it.product.name}</p>
                    <p className="mt-0.5">
                      {it.product.promoPriceCents ? (
                        <>
                          <span className="mr-1.5 text-amora-900/50 line-through">{formatBRL(it.product.priceCents)}</span>
                          <strong>{formatBRL(it.product.promoPriceCents)}</strong>
                        </>
                      ) : (
                        <strong>{formatBRL(it.product.priceCents)}</strong>
                      )}
                    </p>
                  </div>
                </div>
                <Link
                  href={`/produto/${it.product.slug}`}
                  className="mt-2 flex min-h-9 items-center justify-center rounded-lg bg-amora-800 text-xs font-bold uppercase tracking-wide text-creme-50 transition-colors hover:bg-amora-700"
                >
                  Comprar
                </Link>
              </div>
            )}
          </div>
        ))}
      </ProductCarousel>
    </section>
  );
}
