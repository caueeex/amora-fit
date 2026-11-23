import Image from "next/image";
import Link from "next/link";
import { AmoraIcon } from "@/components/brand/logo";

export function DoubleBanner({ items }: { items: { image: string | null; title: string; subtitle: string; href: string }[] }) {
  return (
    <section className="mx-auto grid max-w-6xl gap-3 px-4 pt-12 sm:grid-cols-2 sm:gap-5">
      {items.map((it, i) => {
        const inner = (
          <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-amora-600 to-amora-900">
            {it.image ? (
              <Image src={it.image} alt="" fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 ease-[var(--ease-suave)] group-hover:scale-105" />
            ) : (
              <AmoraIcon className="absolute -right-4 -top-4 h-40 w-40 text-berry/15" />
            )}
            {(it.title || it.subtitle) && (
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-tinta/70 via-transparent to-transparent p-5 sm:p-7">
                {it.title && <h3 className="font-display text-2xl font-bold text-creme-50 sm:text-3xl">{it.title}</h3>}
                {it.subtitle && <p className="mt-1 text-sm text-creme-100/90">{it.subtitle}</p>}
                {it.href && <span className="mt-3 text-sm font-semibold text-creme-300">Ver agora →</span>}
              </div>
            )}
          </div>
        );
        return it.href ? (
          <Link key={i} href={it.href} target={it.href.startsWith("https://") ? "_blank" : undefined} rel={it.href.startsWith("https://") ? "noopener noreferrer" : undefined}>
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </section>
  );
}

export function TextBlock({ eyebrow, title, body, align }: { eyebrow: string; title: string; body: string; align: "left" | "center" }) {
  return (
    <section className={`mx-auto max-w-3xl px-4 pt-14 ${align === "center" ? "text-center" : ""}`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-creme-300/80">{eyebrow}</p>}
      {title && <h2 className="mt-1 font-display text-3xl font-bold text-creme-50">{title}</h2>}
      {body && (
        <div className="mt-4 flex flex-col gap-3 text-base leading-relaxed text-creme-100/85">
          {body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}

function SectionTitle({ title }: { title: string }) {
  return title ? <h2 className="mb-6 text-center font-display text-2xl font-bold uppercase tracking-wide text-creme-50 sm:text-3xl">{title}</h2> : null;
}

/** Cards com foto e texto grande (ex.: "Compre por tamanho"). */
export function ImageTiles({ title, items }: { title: string; items: { image: string | null; label: string; ctaLabel: string; href: string }[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <SectionTitle title={title} />
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-flow-col sm:auto-cols-fr sm:overflow-visible sm:px-0 sm:gap-5">
        {items.map((it, i) => {
          const card = (
            <div className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-amora-600 via-amora-700 to-amora-900">
              {it.image ? (
                <Image src={it.image} alt="" fill sizes="(min-width: 640px) 20vw, 42vw" className="object-cover transition-transform duration-700 ease-[var(--ease-suave)] group-hover:scale-105" />
              ) : (
                <AmoraIcon className="absolute -right-3 -top-3 h-28 w-28 text-berry/15" />
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-tinta/65 via-tinta/5 to-transparent p-4 sm:p-5">
                <span className="font-display text-4xl font-bold leading-none text-creme-50 sm:text-5xl">{it.label}</span>
                {it.ctaLabel && <span className="mt-2 w-fit border-b border-creme-100/70 text-xs font-medium uppercase tracking-[0.15em] text-creme-100 transition-colors group-hover:border-creme-300 group-hover:text-creme-300">{it.ctaLabel}</span>}
              </div>
            </div>
          );
          return (
            <li key={i} className="w-[42%] shrink-0 snap-start sm:w-auto">
              {it.href ? <Link href={it.href}>{card}</Link> : card}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Classes completas (o Tailwind não gera classes montadas dinamicamente).
const LINK_COLS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-3 lg:grid-cols-6",
};

/** Atalhos só com texto (ex.: "Compre do seu jeito" por faixa de preço). */
export function LinkCards({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-14">
      <SectionTitle title={title} />
      <ul className={`grid gap-3 sm:gap-5 ${LINK_COLS[Math.min(items.length, 6)]}`}>
        {items.map((it, i) => (
          <li key={i}>
            <Link
              href={it.href || "/produtos"}
              className="group grid min-h-28 place-items-center rounded-[var(--radius-card)] border border-creme-300/15 bg-amora-700/40 px-4 py-8 text-center transition-colors hover:border-creme-300/50 hover:bg-amora-700/70"
            >
              <span className="border-b-2 border-creme-100/60 font-display text-2xl font-bold uppercase tracking-wide text-creme-50 transition-colors group-hover:border-creme-300 group-hover:text-creme-300 sm:text-3xl">
                {it.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
