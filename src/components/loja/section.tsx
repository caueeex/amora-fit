import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  id,
  eyebrow,
  title,
  href,
  hrefLabel = "Ver todos",
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-titulo` : undefined} className="mx-auto max-w-6xl px-4 pt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-creme-300/80">{eyebrow}</p>}
          <h2 id={id ? `${id}-titulo` : undefined} className="font-display text-2xl font-bold text-creme-50 sm:text-3xl">
            {title}
          </h2>
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-creme-300 underline-offset-4 hover:underline">
            {hrefLabel} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
