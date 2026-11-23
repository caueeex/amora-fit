"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/domain/money";

type Day = { day: string; revenue_cents: number; orders: number };

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long", timeZone: "UTC" });

/** Arredonda o topo do eixo para um valor "bonito" (em reais). */
function niceMax(cents: number): number {
  if (cents <= 0) return 10000;
  const reais = cents / 100;
  const pow = 10 ** Math.floor(Math.log10(reais));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * pow >= reais) ?? 10;
  return step * pow * 100;
}

/**
 * Faturamento por dia (série única → sem legenda; o título nomeia).
 * Barras finas com topo arredondado, grade discreta, dica ao passar o mouse
 * e tabela equivalente para leitores de tela.
 */
export function SalesChart({ data }: { data: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.map((d) => d.revenue_cents), 0));
  const ticks = [max, max / 2, 0];
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const h = hover !== null ? data[hover] : null;

  return (
    <div>
      <div className="relative grid grid-cols-[auto_1fr] gap-3">
        {/* Eixo Y */}
        <div className="flex h-52 flex-col justify-between py-0 text-right text-[11px] tabular-nums text-amora-900/45" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatBRL(t).replace(",00", "")}
            </span>
          ))}
        </div>

        <div className="relative h-52" onMouseLeave={() => setHover(null)}>
          {/* Grade */}
          {ticks.map((t, i) => (
            <div key={t} className={`absolute inset-x-0 border-t ${i === ticks.length - 1 ? "border-amora-900/20" : "border-dashed border-amora-900/10"}`} style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} aria-hidden="true" />
          ))}

          {/* Barras */}
          <div className="absolute inset-0 flex items-end gap-[2px]" aria-hidden="true">
            {data.map((d, i) => {
              const pct = (d.revenue_cents / max) * 100;
              return (
                <div key={d.day} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
                  {hover === i && <div className="absolute inset-y-0 w-full rounded-md bg-amora-900/[0.04]" />}
                  <div
                    className="relative w-full max-w-6 rounded-t-[4px] transition-opacity"
                    style={{
                      height: d.revenue_cents > 0 ? `max(${pct}%, 3px)` : "0",
                      backgroundColor: "#A3426F",
                      opacity: hover === null || hover === i ? 1 : 0.55,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Dica */}
          {h && (
            <div
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-amora-900/10 bg-white px-3 py-2 text-xs shadow-lg"
              style={{ left: `${((hover! + 0.5) / data.length) * 100}%` }}
            >
              <p className="font-semibold capitalize text-amora-950">{fullFmt.format(new Date(`${h.day}T00:00:00Z`))}</p>
              <p className="mt-1 flex items-center gap-2 text-amora-900/80">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: "#A3426F" }} aria-hidden="true" />
                Faturamento <strong className="ml-auto tabular-nums text-amora-950">{formatBRL(h.revenue_cents)}</strong>
              </p>
              <p className="mt-0.5 text-amora-900/60">
                {h.orders} {h.orders === 1 ? "pedido" : "pedidos"} no dia
              </p>
            </div>
          )}
        </div>

        {/* Eixo X */}
        <div />
        <div className="flex gap-[2px] text-[11px] text-amora-900/45" aria-hidden="true">
          {data.map((d, i) => (
            <span key={d.day} className="flex-1 text-center">
              {i % labelEvery === 0 ? dayFmt.format(new Date(`${d.day}T00:00:00Z`)).replace(".", "") : ""}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Faturamento por dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Faturamento</th>
            <th>Pedidos</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{formatBRL(d.revenue_cents)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
