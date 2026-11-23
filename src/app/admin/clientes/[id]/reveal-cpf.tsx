"use client";

import { useState } from "react";

/** CPF mascarado por padrão; revela só quando o admin pede. */
export function RevealCpf({ cpf }: { cpf: string }) {
  const [show, setShow] = useState(false);
  const formatted = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular-nums">{show ? formatted : `***.***.***-${cpf.slice(-2)}`}</span>
      <button type="button" onClick={() => setShow((s) => !s)} className="text-xs font-semibold text-amora-700 hover:underline">
        {show ? "ocultar" : "mostrar"}
      </button>
    </span>
  );
}
