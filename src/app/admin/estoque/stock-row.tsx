"use client";

import { useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/ui";
import type { StockRow as Row } from "@/lib/admin/stock";
import { adjustStockAction, setLowStockThresholdAction } from "./actions";

const MODES = [
  { id: "entrada", label: "Entrada", hint: "Chegou mercadoria" },
  { id: "saida", label: "Saída", hint: "Avaria, perda, uso interno" },
  { id: "definir", label: "Definir total", hint: "Contagem física" },
] as const;

export function StockRow({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("entrada");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [threshold, setThreshold] = useState(String(row.low_stock_threshold));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const status =
    !row.is_active || row.product_status === "archived"
      ? { label: "Inativa", cls: "bg-stone-200 text-stone-700" }
      : row.available === 0
        ? { label: "⚠ Esgotado", cls: "bg-red-100 text-red-900" }
        : row.available <= row.low_stock_threshold
          ? { label: "⚠ Baixo", cls: "bg-amber-100 text-amber-900" }
          : { label: "OK", cls: "bg-emerald-100 text-emerald-900" };

  function submit() {
    const quantity = Number(qty);
    if (!Number.isInteger(quantity) || quantity < 0 || qty === "") {
      setMsg({ ok: false, text: "Informe uma quantidade válida." });
      return;
    }
    start(async () => {
      const r = await adjustStockAction({ variantId: row.variant_id, mode, quantity, reason });
      if (r.ok) {
        setMsg({ ok: true, text: r.message });
        setQty("");
        setReason("");
        setOpen(false);
      } else setMsg({ ok: false, text: r.error });
    });
  }

  function saveThreshold() {
    const value = Number(threshold);
    if (value === row.low_stock_threshold) return;
    start(async () => {
      const r = await setLowStockThresholdAction({ variantId: row.variant_id, value });
      setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
    });
  }

  return (
    <li className="rounded-2xl border border-amora-900/10 bg-white">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-3 md:grid-cols-[minmax(0,1.6fr)_repeat(3,5.5rem)_5rem_6rem_7.5rem]">
        <div className="min-w-0">
          <p className="truncate font-medium text-amora-950">{row.product_name}</p>
          <p className="flex items-center gap-1.5 text-xs text-amora-900/60">
            <span className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ backgroundColor: row.color_hex }} aria-hidden="true" />
            {row.color_name} · {row.size}
          </p>
        </div>
        <span className={`justify-self-end rounded-full px-2.5 py-1 text-xs font-semibold md:order-last md:justify-self-start ${status.cls}`}>{status.label}</span>

        <dl className="col-span-2 grid grid-cols-3 gap-2 text-center text-xs md:col-span-3 md:contents">
          <div className="rounded-lg bg-amora-100/25 py-1.5 md:bg-transparent md:py-0 md:text-right">
            <dt className="text-amora-900/55 md:sr-only">Em mãos</dt>
            <dd className="text-base font-semibold tabular-nums text-amora-950 md:text-sm">{row.on_hand}</dd>
          </div>
          <div className="rounded-lg bg-amora-100/25 py-1.5 md:bg-transparent md:py-0 md:text-right">
            <dt className="text-amora-900/55 md:sr-only">Reservado</dt>
            <dd className="text-base tabular-nums text-amora-900/70 md:text-sm">{row.reserved}</dd>
          </div>
          <div className="rounded-lg bg-amora-100/25 py-1.5 md:bg-transparent md:py-0 md:text-right">
            <dt className="text-amora-900/55 md:sr-only">Disponível</dt>
            <dd className={`text-base font-bold tabular-nums md:text-sm ${row.available === 0 ? "text-red-700" : "text-amora-950"}`}>{row.available}</dd>
          </div>
        </dl>

        <label className="flex items-center gap-2 text-xs text-amora-900/60 md:justify-end">
          <span className="md:sr-only">Mínimo</span>
          <input
            type="number"
            min={0}
            max={1000}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            onBlur={saveThreshold}
            aria-label={`Estoque mínimo de ${row.product_name} ${row.color_name} ${row.size}`}
            className="w-16 rounded-lg border border-amora-900/15 px-2 py-1 text-right text-sm tabular-nums"
          />
        </label>

        <AdminButton variant={open ? "primary" : "secondary"} className="min-h-9 justify-self-end px-3" onClick={() => (setOpen((o) => !o), setMsg(null))}>
          Ajustar
        </AdminButton>
      </div>

      {msg && !open && (
        <p className={`mx-3 mb-3 rounded-lg px-3 py-1.5 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`} role="status">
          {msg.ok ? "✓ " : ""}
          {msg.text}
        </p>
      )}

      {open && (
        <div className="flex flex-col gap-3 border-t border-amora-900/10 bg-amora-100/15 p-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de ajuste">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                aria-pressed={mode === m.id}
                className={`rounded-xl border px-3 py-1.5 text-left text-sm transition-colors ${mode === m.id ? "border-amora-800 bg-amora-800 text-creme-50" : "border-amora-900/15 bg-white text-amora-900"}`}
              >
                <span className="block font-semibold">{m.label}</span>
                <span className={`text-[11px] ${mode === m.id ? "text-creme-100/80" : "text-amora-900/55"}`}>{m.hint}</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-[8rem_1fr_auto]">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder={mode === "definir" ? "Total contado" : "Quantidade"}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label="Quantidade"
              className="min-h-10 rounded-xl border border-amora-900/15 bg-white px-3 text-sm tabular-nums"
            />
            <input
              placeholder={mode === "entrada" ? "Observação (opcional)" : "Motivo (obrigatório)"}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-label="Motivo"
              className="min-h-10 rounded-xl border border-amora-900/15 bg-white px-3 text-sm"
            />
            <AdminButton loading={pending} onClick={submit}>
              Confirmar
            </AdminButton>
          </div>
          {mode === "saida" && row.reserved > 0 && (
            <p className="text-xs text-amora-900/60">{row.reserved} un. estão reservadas em pedidos abertos e não podem ser retiradas.</p>
          )}
          {msg && !msg.ok && <p className="rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-800">{msg.text}</p>}
        </div>
      )}
    </li>
  );
}
