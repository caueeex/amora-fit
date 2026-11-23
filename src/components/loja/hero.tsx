import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { sizeRank } from "@/lib/catalog/normalize";
import type { CatalogProduct, Category, StoreSettings } from "@/lib/catalog/types";
import { formatBRL } from "@/lib/domain/money";
import { ProductImage } from "./product-image";

/** Remove emojis do texto (no título eles ficam pesados e cartunescos). */
function stripEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
}

/** Separa as duas últimas palavras para o destaque em itálico. */
function splitHeadline(text: string): [string, string] {
  const words = text.split(" ");
  if (words.length < 4) return [text, ""];
  return [words.slice(0, -2).join(" "), words.slice(-2).join(" ")];
}

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function Hero({
  settings,
  categories,
  products,
}: {
  settings: StoreSettings;
  categories: Category[];
  /** Todo o catálogo; o hero escolhe os destaques para a composição. */
  products: CatalogProduct[];
}) {
  const [lead, accent] = splitHeadline(stripEmoji(settings.tagline || "Moda fitness que te acompanha em movimento"));

  const available = products.filter((p) => p.totalAvailable > 0);
  const showcase = [
    ...available.filter((p) => p.isFeatured),
    ...available.filter((p) => !p.isFeatured),
  ].slice(0, 2);

  const minPrice = available.length ? Math.min(...available.map((p) => p.effectivePriceCents)) : null;
  const sizes = [...new Set(available.flatMap((p) => p.sizes))].filter((s) => s !== "U").sort((a, b) => sizeRank(a) - sizeRank(b));
  const sizeRange = sizes.length > 1 ? `${sizes[0]} ao ${sizes[sizes.length - 1]}` : sizes[0];

  const categoryNames = categories.map((c) => c.name.toLowerCase());

  return (
    <section className="relative isolate overflow-hidden border-b border-creme-300/10">
      {/* Fundo: brilhos suaves e anéis finos, sem "card" genérico */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-amora-600/40 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-berry/15 blur-3xl" />
        <div className="absolute right-[8%] top-10 hidden h-[30rem] w-[30rem] rounded-full border border-creme-300/10 lg:block" />
        <div className="absolute right-[14%] top-24 hidden h-[22rem] w-[22rem] rounded-full border border-creme-300/[0.07] lg:block" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
        {/* Texto */}
        <div className="animate-[subir_700ms_var(--ease-suave)]">
          <p className="inline-flex items-center gap-2 rounded-full border border-creme-300/25 bg-amora-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-creme-200">
            <span className="h-1.5 w-1.5 rounded-full bg-creme-300" aria-hidden="true" />
            Coleção {settings.storeName}
          </p>

          <h1 className="mt-6 font-display text-[2.75rem] font-bold leading-[0.95] tracking-[-0.02em] text-creme-50 sm:text-6xl lg:text-7xl">
            {lead}
            {accent && (
              <>
                {" "}
                <em className="block font-medium italic text-creme-300">{accent}</em>
              </>
            )}
          </h1>

          {categoryNames.length > 0 && (
            <p className="mt-6 max-w-md text-base leading-relaxed text-creme-100/80 sm:text-lg">
              {joinPt(categoryNames).replace(/^./, (c) => c.toUpperCase())} pensados para treinar com conforto e sair com estilo.
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/produtos" className={buttonClasses({ size: "lg", className: "px-8" })}>
              Comprar agora
            </Link>
            <Link href="/produtos?ordem=novidades" className={buttonClasses({ size: "lg", variant: "secondary" })}>
              Ver novidades
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-creme-100/75">
            {sizeRange && (
              <li className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-creme-300/10 text-creme-300">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" strokeLinejoin="round" />
                    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                Tamanhos {sizeRange}
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-creme-300/10 text-creme-300">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.2-.7-2.7-1-4.4-3.8-4.6-4-.1-.2-1.1-1.4-1.1-2.7s.7-1.9 1-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.4Z" />
                </svg>
              </span>
              Atendimento pelo WhatsApp
            </li>
          </ul>
        </div>

        {/* Composição com produtos reais */}
        {showcase.length > 0 && (
          <div className="relative mx-auto h-[22rem] w-full max-w-md sm:h-[28rem] lg:h-[32rem] lg:max-w-none">
            {showcase[0] && (
              <Link
                href={`/produto/${showcase[0].slug}`}
                className="group absolute right-0 top-0 w-[64%] rotate-[3deg] overflow-hidden rounded-[1.5rem] border border-creme-300/20 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] transition-transform duration-500 ease-[var(--ease-suave)] hover:rotate-[1deg] hover:-translate-y-1"
              >
                <ProductImage
                  src={showcase[0].images[0]?.url}
                  alt={showcase[0].images[0]?.alt ?? showcase[0].name}
                  sizes="(min-width: 1024px) 30vw, 60vw"
                  priority
                  className="aspect-[4/5]"
                />
                <span className="absolute bottom-3 left-[34%] right-3 rounded-2xl bg-amora-950/75 px-4 py-3 backdrop-blur-md">
                  <span className="block truncate text-sm font-semibold text-creme-50">{showcase[0].name}</span>
                  <span className="text-sm font-bold text-creme-300">{formatBRL(showcase[0].effectivePriceCents)}</span>
                </span>
              </Link>
            )}
            {showcase[1] && (
              <Link
                href={`/produto/${showcase[1].slug}`}
                className="group absolute bottom-0 left-0 w-[50%] -rotate-[4deg] overflow-hidden rounded-[1.5rem] border border-creme-300/20 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] transition-transform duration-500 ease-[var(--ease-suave)] hover:-rotate-[2deg] hover:-translate-y-1"
              >
                <ProductImage
                  src={showcase[1].images[0]?.url}
                  alt={showcase[1].images[0]?.alt ?? showcase[1].name}
                  sizes="(min-width: 1024px) 24vw, 45vw"
                  className="aspect-[4/5]"
                />
                <span className="absolute inset-x-2.5 bottom-2.5 rounded-xl bg-amora-950/75 px-3 py-2 backdrop-blur-md">
                  <span className="block truncate text-xs font-semibold text-creme-50">{showcase[1].name}</span>
                  <span className="text-xs font-bold text-creme-300">{formatBRL(showcase[1].effectivePriceCents)}</span>
                </span>
              </Link>
            )}
            {minPrice !== null && (
              <div className="absolute left-[38%] top-[8%] rotate-[-8deg] rounded-full bg-creme-300 px-4 py-3 text-center text-amora-900 shadow-[0_12px_30px_-10px_rgb(255_236_158/0.6)] sm:left-[30%]">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.15em]">a partir de</span>
                <span className="font-display text-lg font-bold leading-none">{formatBRL(minPrice)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
