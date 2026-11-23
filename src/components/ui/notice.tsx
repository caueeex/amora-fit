import type { ReactNode } from "react";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-amora-300/50 bg-amora-950/50 text-amora-100",
  success: "border-creme-300/50 bg-creme-300/10 text-creme-100",
  info: "border-creme-300/20 bg-amora-700/40 text-creme-100",
};

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
