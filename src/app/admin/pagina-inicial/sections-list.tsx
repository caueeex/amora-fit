"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton } from "@/components/admin/ui";
import type { AdminSectionRow } from "@/lib/admin/home";
import { scheduleState, SECTION_LABEL, SECTION_TYPES, type SectionType } from "@/lib/home/sections";
import { addSectionAction, deleteSectionAction, moveSectionAction, toggleSectionAction } from "./actions";

const dt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
const STATE = {
  live: { label: "No ar", cls: "bg-emerald-100 text-emerald-900" },
  off: { label: "Desligada", cls: "bg-stone-200 text-stone-700" },
  scheduled: { label: "Agendada", cls: "bg-sky-100 text-sky-900" },
  expired: { label: "Encerrada", cls: "bg-amber-100 text-amber-900" },
};

export function SectionsList({ sections }: { sections: AdminSectionRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Erro.");
    });

  function add(type: SectionType) {
    start(async () => {
      const r = await addSectionAction(type);
      if (r.ok && r.id) router.push(`/admin/pagina-inicial/${r.id}?nova=1`);
      else if (!r.ok) setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <ol className="flex flex-col gap-2">
        {sections.map((s, i) => {
          const st = STATE[scheduleState(s)];
          return (
            <li key={s.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3 ${s.is_active ? "border-amora-900/10" : "border-dashed border-amora-900/20 opacity-75"}`}>
              <span className="w-6 text-center text-sm font-semibold tabular-nums text-amora-900/40">{i + 1}</span>
              <span className="relative grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-amora-100/50 text-[10px] text-amora-900/50">
                {s.thumb ? <Image src={s.thumb} alt="" fill sizes="64px" className="object-cover" /> : SECTION_LABEL[s.type].label.split(" ")[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-amora-950">{s.title || SECTION_LABEL[s.type].label}</span>
                <span className="block truncate text-xs text-amora-900/55">
                  {SECTION_LABEL[s.type].label}
                  {s.summary ? ` · ${s.summary}` : ""}
                  {s.starts_at && ` · de ${dt.format(new Date(s.starts_at))}`}
                  {s.ends_at && ` até ${dt.format(new Date(s.ends_at))}`}
                  {!s.valid && " · ⚠ configuração inválida (não aparece na loja)"}
                </span>
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
              <div className="flex items-center gap-1">
                <AdminButton variant="ghost" className="min-h-9 px-2" disabled={pending || i === 0} onClick={() => run(() => moveSectionAction(s.id, -1))} aria-label="Subir">
                  ↑
                </AdminButton>
                <AdminButton variant="ghost" className="min-h-9 px-2" disabled={pending || i === sections.length - 1} onClick={() => run(() => moveSectionAction(s.id, 1))} aria-label="Descer">
                  ↓
                </AdminButton>
                <label className="mx-1 inline-flex cursor-pointer items-center gap-2 text-xs text-amora-900/70">
                  <input type="checkbox" checked={s.is_active} disabled={pending} onChange={(e) => run(() => toggleSectionAction(s.id, e.target.checked))} className="h-4 w-4 accent-amora-800" />
                  Ativa
                </label>
                <Link href={`/admin/pagina-inicial/${s.id}`} className="inline-flex min-h-9 items-center rounded-xl border border-amora-900/15 px-3 text-sm font-semibold text-amora-900 hover:border-amora-800/40">
                  Editar
                </Link>
                <AdminButton
                  variant="ghost"
                  className="min-h-9 px-2 text-red-700"
                  disabled={pending}
                  onClick={() => window.confirm("Excluir esta seção?") && run(() => deleteSectionAction(s.id))}
                  aria-label="Excluir seção"
                >
                  ✕
                </AdminButton>
              </div>
            </li>
          );
        })}
      </ol>

      {adding ? (
        <div className="rounded-2xl border border-amora-900/10 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-amora-950">Que tipo de seção?</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_TYPES.map((t) => (
              <button key={t} type="button" disabled={pending} onClick={() => add(t)} className="rounded-xl border border-amora-900/15 p-3 text-left transition-colors hover:border-amora-800 hover:bg-amora-100/30">
                <span className="block text-sm font-semibold text-amora-950">{SECTION_LABEL[t].label}</span>
                <span className="text-xs text-amora-900/60">{SECTION_LABEL[t].hint}</span>
              </button>
            ))}
          </div>
          <AdminButton variant="ghost" className="mt-3" onClick={() => setAdding(false)}>
            Cancelar
          </AdminButton>
        </div>
      ) : (
        <AdminButton className="self-start" onClick={() => setAdding(true)}>
          + Adicionar seção
        </AdminButton>
      )}
    </div>
  );
}
