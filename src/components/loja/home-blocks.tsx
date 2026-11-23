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
