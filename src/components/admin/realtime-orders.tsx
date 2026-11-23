"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatBRL } from "@/lib/domain/money";
import { formatOrderNumber } from "@/lib/domain/order-status";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type NewOrder = { id: string; order_number: number; customer_name: string; total_cents: number };

/** Toque curto gerado no navegador (sem arquivo de áudio). */
function chime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [880, 1318.5].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // navegador bloqueou áudio sem interação: segue só o aviso visual
  }
}

/**
 * Tempo real do painel. Escuta inserções/atualizações em `orders` (o RLS do
 * Supabase só entrega eventos a quem é admin) e:
 *  - recarrega os dados da página a partir do SERVIDOR (router.refresh),
 *    então não há registro duplicado nem dado "inventado" no navegador;
 *  - mostra um aviso + som quando chega um pedido novo.
 * Ao reconectar, recarrega de novo para buscar o que chegou enquanto estava offline.
 */
export function RealtimeOrders() {
  const router = useRouter();
  const [toasts, setToasts] = useState<NewOrder[]>([]);
  const [status, setStatus] = useState<"conectando" | "ao vivo" | "reconectando">("conectando");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let wasDown = false;
    let cancelled = false;

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 300);
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) supabase.realtime.setAuth(data.session.access_token);

      channel = supabase
        .channel("admin-orders")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
          const o = payload.new as NewOrder;
          if (seen.current.has(o.id)) return; // evita aviso duplicado em reenvios
          seen.current.add(o.id);
          setToasts((t) => [...t.slice(-2), o]);
          chime();
          scheduleRefresh();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, scheduleRefresh)
        .subscribe((s) => {
          if (s === "SUBSCRIBED") {
            setStatus("ao vivo");
            if (wasDown) scheduleRefresh();
            wasDown = false;
          } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
            setStatus("reconectando");
            wasDown = true;
          }
        });
    })();

    return () => {
      cancelled = true;
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((list) => list.slice(1)), 9000);
    return () => clearTimeout(t);
  }, [toasts]);

  return (
    <>
      <span className="inline-flex items-center gap-2 text-xs text-amora-900/60" role="status">
        <span className={`h-2 w-2 rounded-full ${status === "ao vivo" ? "bg-emerald-500" : "animate-pulse bg-amber-500"}`} aria-hidden="true" />
        {status === "ao vivo" ? "Pedidos ao vivo" : status === "conectando" ? "Conectando…" : "Reconectando…"}
      </span>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="assertive">
        {toasts.map((o) => (
          <Link
            key={o.id}
            href={`/admin/pedidos/${o.id}`}
            onClick={() => setToasts((t) => t.filter((x) => x.id !== o.id))}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-amora-800/20 bg-amora-800 p-4 text-creme-50 shadow-2xl animate-[subir_250ms_var(--ease-suave)]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-creme-300 text-lg" aria-hidden="true">
              🛍️
            </span>
            <span className="min-w-0 text-sm">
              <strong className="block">Novo pedido {formatOrderNumber(o.order_number)}</strong>
              <span className="block truncate text-creme-100/80">
                {o.customer_name} · {formatBRL(o.total_cents)}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
