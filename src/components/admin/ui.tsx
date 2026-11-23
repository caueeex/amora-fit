import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { STATUS_LABEL, type OrderStatus } from "@/lib/domain/order-status";

/** Kit visual do painel: fundo claro, tinta vinho, destaques da marca. */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-amora-900/10 bg-white p-5 shadow-[0_1px_2px_rgb(42_4_24/0.04)] ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-amora-950">{children}</h2>
      {action}
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const btn: Record<BtnVariant, string> = {
  primary: "bg-amora-800 text-creme-50 hover:bg-amora-700",
  secondary: "border border-amora-900/15 bg-white text-amora-900 hover:border-amora-800/40 hover:bg-amora-100/40",
  ghost: "text-amora-800 hover:bg-amora-100/50",
  danger: "border border-red-700/20 bg-white text-red-800 hover:bg-red-50",
};

export function adminButton(variant: BtnVariant = "primary", className = "") {
  return `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${btn[variant]} ${className}`;
}

export function AdminButton({
  variant = "primary",
  loading,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button className={adminButton(variant, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

const control =
  "w-full rounded-xl border border-amora-900/15 bg-white px-3 text-sm text-amora-950 placeholder:text-amora-900/35 transition-colors focus:border-amora-700 focus:outline-none focus:ring-2 focus:ring-amora-700/15";

export function AdminInput({ label, error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-amora-950">{label}</span>
      <input className={`${control} min-h-10 ${error ? "border-red-600" : ""}`} aria-invalid={error ? true : undefined} {...rest} />
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

export function AdminSelect({ label, children, className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-amora-950">{label}</span>
      <select className={`${control} min-h-10`} {...rest}>
        {children}
      </select>
    </label>
  );
}

export function AdminTextarea({ label, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-amora-950">{label}</span>
      <textarea className={`${control} py-2`} rows={3} {...rest} />
    </label>
  );
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  AWAITING_PAYMENT: "bg-orange-100 text-orange-900",
  PAID: "bg-emerald-100 text-emerald-900",
  PROCESSING: "bg-sky-100 text-sky-900",
  INVOICED: "bg-indigo-100 text-indigo-900",
  SHIPPED: "bg-violet-100 text-violet-900",
  COMPLETED: "bg-stone-200 text-stone-800",
  CANCELLED: "bg-red-100 text-red-900",
};

/** Status sempre com texto (nunca só cor). */
export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-amora-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-amora-900/60">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
