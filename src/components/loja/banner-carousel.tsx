"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AmoraIcon } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";

export type BannerSlide = {
  image: string | null;
  mobileImage: string | null;
  /** Vídeo de fundo (sem som, em repetição). A imagem vira a capa enquanto carrega. */
  video: string | null;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  align: "left" | "center";
};

/**
 * Carrossel de banners: arrastar no celular (scroll-snap), setas e bolinhas,
 * troca automática que pausa ao passar o mouse/focar e respeita "reduzir movimento".
 */
export function BannerCarousel({ slides, autoplaySeconds }: { slides: BannerSlide[]; autoplaySeconds: number }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = el.children.length;
    const target = ((i % n) + n) % n;
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || autoplaySeconds <= 0 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(index + 1), autoplaySeconds * 1000);
    return () => clearInterval(t);
  }, [slides.length, autoplaySeconds, paused, index, go]);

  return (
    <section
      aria-roledescription="carrossel"
      aria-label="Destaques"
      className="relative mx-auto max-w-6xl px-4 pt-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div ref={track} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem]">
        {slides.map((s, i) => {
          const content = (
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-gradient-to-br from-amora-600 via-amora-700 to-amora-950 sm:aspect-[21/9]">
              {s.video ? (
                <video
                  src={s.video}
                  poster={s.image ?? s.mobileImage ?? undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload={i === 0 ? "auto" : "metadata"}
                  className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
                  aria-hidden="true"
                />
              ) : null}
              {s.video && !(s.image || s.mobileImage) ? null : s.image || s.mobileImage ? (
                <>
                  <Image src={(s.mobileImage ?? s.image)!} alt="" fill priority={i === 0} sizes="100vw" className={`object-cover sm:hidden ${s.video ? "motion-safe:hidden" : ""}`} />
                  <Image src={(s.image ?? s.mobileImage)!} alt="" fill priority={i === 0} sizes="(min-width: 1152px) 1152px, 100vw" className={`hidden object-cover sm:block ${s.video ? "motion-safe:sm:hidden" : ""}`} />
                </>
              ) : (
                <AmoraIcon className="absolute -right-6 -top-6 h-56 w-56 text-berry/15" />
              )}
              {(s.title || s.subtitle || s.ctaLabel) && (
                <div
                  className={`absolute inset-0 flex flex-col justify-end gap-3 bg-gradient-to-t from-tinta/75 via-tinta/20 to-transparent p-6 sm:justify-center sm:bg-gradient-to-r sm:p-12 ${
                    s.align === "center" ? "items-center text-center sm:bg-none sm:bg-tinta/35" : "items-start"
                  }`}
                >
                  {s.title && <h2 className="max-w-xl font-display text-3xl font-bold leading-tight text-creme-50 sm:text-5xl">{s.title}</h2>}
                  {s.subtitle && <p className="max-w-md text-sm text-creme-100/90 sm:text-lg">{s.subtitle}</p>}
                  {s.ctaLabel && s.ctaHref && <span className={buttonClasses({ size: "lg", className: "mt-2" })}>{s.ctaLabel}</span>}
                </div>
              )}
            </div>
          );
          return (
            <div key={i} className="w-full shrink-0 snap-start" role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}${s.title ? `: ${s.title}` : ""}`}>
              {s.ctaHref ? (
                <Link href={s.ctaHref} className="block" target={s.ctaHref.startsWith("https://") ? "_blank" : undefined} rel={s.ctaHref.startsWith("https://") ? "noopener noreferrer" : undefined}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => go(index - 1)} aria-label="Banner anterior" className="absolute left-7 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-tinta/40 text-creme-50 backdrop-blur transition-colors hover:bg-creme-300 hover:text-amora-900 sm:grid">
            ‹
          </button>
          <button type="button" onClick={() => go(index + 1)} aria-label="Próximo banner" className="absolute right-7 top-1/2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-tinta/40 text-creme-50 backdrop-blur transition-colors hover:bg-creme-300 hover:text-amora-900 sm:grid">
            ›
          </button>
          <div className="mt-3 flex justify-center gap-2" role="tablist" aria-label="Escolher banner">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Banner ${i + 1}`}
                onClick={() => go(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-creme-300" : "w-2 bg-creme-100/35 hover:bg-creme-100/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
