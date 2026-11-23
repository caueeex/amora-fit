import { AmoraIcon } from "@/components/brand/logo";

/**
 * Ilustrações de traço fino por tipo de peça. Usadas nos círculos de categoria
 * enquanto não houver foto (da categoria ou de um produto dela).
 */
type IconProps = { className?: string };

const base = {
  viewBox: "0 0 64 64",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function Top({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M23 10c1 7 2 11 4 14M41 10c-1 7-2 11-4 14" />
      <path d="M18 27c4-4 9-5 14-1 5-4 10-3 14 1" />
      <path d="M18 27c-1 5-1 9 0 13 9 3 19 3 28 0 1-4 1-8 0-13" />
      <path d="M19 35c8 2 18 2 26 0" opacity=".6" />
    </svg>
  );
}

function Shorts({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M18 16h28" />
      <path d="M18 16v6h28v-6" />
      <path d="M18 22l-3 24 14 2 3-16 3 16 14-2-3-24" />
      <path d="M32 22v10" opacity=".6" />
    </svg>
  );
}

function Legging({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 7h22v6H21z" />
      <path d="M21 13l-2 44h10l3-34 3 34h10l-2-44" />
      <path d="M32 13v10" opacity=".6" />
      <path d="M20 50h9M35 50h9" opacity=".6" />
    </svg>
  );
}

function Macaquinho({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M24 7c0 6 1 9 2 11M40 7c0 6-1 9-2 11" />
      <path d="M21 19c4 3 18 3 22 0" />
      <path d="M21 19c-1 8 0 13 1 17l-4 15 12 2 2-12 2 12 12-2-4-15c1-4 2-9 1-17" />
      <path d="M22 36c6 2 14 2 20 0" opacity=".6" />
    </svg>
  );
}

function Conjunto({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M25 6c1 4 1 6 2 8M39 6c-1 4-1 6-2 8" />
      <path d="M21 16c3-3 7-3 11 0 4-3 8-3 11 0" />
      <path d="M21 16v6c7 2 15 2 22 0v-6" />
      <path d="M22 30h20v4H22z" />
      <path d="M22 34l-2 24h9l3-17 3 17h9l-2-24" />
    </svg>
  );
}

const BY_SLUG: Record<string, (p: IconProps) => React.JSX.Element> = {
  tops: Top,
  top: Top,
  shorts: Shorts,
  short: Shorts,
  leggings: Legging,
  legging: Legging,
  calcas: Legging,
  macaquinhos: Macaquinho,
  macaquinho: Macaquinho,
  macacoes: Macaquinho,
  conjuntos: Conjunto,
  conjunto: Conjunto,
};

export function GarmentIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = BY_SLUG[slug];
  return Icon ? <Icon className={className} /> : <AmoraIcon className={className} />;
}

/** Ícones de traço para itens especiais do menu. */
export function SparkleIcon({ className }: IconProps) {
  return (
    <svg {...base} viewBox="0 0 24 24" strokeWidth={1.5} className={className}>
      <path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7Z" />
      <path d="M19 15.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z" />
    </svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <svg {...base} viewBox="0 0 24 24" strokeWidth={1.5} className={className}>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.6 7.6a1 1 0 0 1-1.4 0l-8-8.6Z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}
