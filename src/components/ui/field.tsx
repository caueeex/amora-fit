import { useId, type InputHTMLAttributes } from "react";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

/** Campo de formulário acessível: label associado, erro anunciado e ligado via aria. */
export function Field({ label, error, hint, id, className = "", ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-creme-100">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={
          "min-h-12 rounded-xl border bg-amora-950/40 px-4 text-base text-creme-50 " +
          "placeholder:text-creme-100/40 transition-colors duration-200 " +
          "focus:border-creme-300 focus:bg-amora-950/60 focus:outline-none " +
          (error ? "border-amora-300" : "border-creme-300/20 hover:border-creme-300/40")
        }
        {...input}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-creme-100/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-amora-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
