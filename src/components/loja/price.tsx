import { formatBRL } from "@/lib/domain/money";

export function Price({
  priceCents,
  promoPriceCents,
  size = "md",
}: {
  priceCents: number;
  promoPriceCents: number | null;
  size?: "md" | "lg";
}) {
  const big = size === "lg";
  if (promoPriceCents !== null && promoPriceCents < priceCents) {
    const off = Math.round((1 - promoPriceCents / priceCents) * 100);
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={`font-bold text-creme-300 ${big ? "text-3xl" : "text-base"}`}>{formatBRL(promoPriceCents)}</span>
        <span className={`text-creme-100/50 line-through ${big ? "text-base" : "text-xs"}`}>
          <span className="sr-only">de </span>
          {formatBRL(priceCents)}
        </span>
        <span className="rounded-full bg-creme-300/15 px-2 py-0.5 text-[11px] font-semibold text-creme-300">-{off}%</span>
      </div>
    );
  }
  return <span className={`font-bold text-creme-300 ${big ? "text-3xl" : "text-base"}`}>{formatBRL(priceCents)}</span>;
}
