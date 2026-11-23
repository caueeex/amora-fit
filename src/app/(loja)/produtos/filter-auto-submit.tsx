"use client";

import { useEffect } from "react";

/**
 * Melhoria progressiva: com JavaScript, aplica os filtros assim que um chip,
 * caixa ou ordenação muda (sem precisar clicar em "Aplicar").
 * Campos de preço continuam aplicando no Enter/"Aplicar". Parâmetros vazios são omitidos da URL.
 */
export function FilterAutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const cleanEmpty = () => {
      for (const el of Array.from(form.elements)) {
        const input = el as HTMLInputElement;
        if (input.name && "value" in input && input.value === "" && input.type !== "checkbox" && input.type !== "radio") {
          input.disabled = true;
        }
      }
      form.querySelectorAll<HTMLInputElement>('input[type="radio"][value=""]:checked').forEach((r) => (r.disabled = true));
      setTimeout(() => form.querySelectorAll<HTMLInputElement>("[disabled]").forEach((i) => (i.disabled = false)), 0);
    };

    const onChange = (e: Event) => {
      const t = e.target as HTMLInputElement;
      if (t.type === "number") return;
      cleanEmpty();
      form.requestSubmit();
    };
    const onSubmit = () => cleanEmpty();

    form.addEventListener("change", onChange);
    form.addEventListener("submit", onSubmit);
    return () => {
      form.removeEventListener("change", onChange);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId]);

  return null;
}
