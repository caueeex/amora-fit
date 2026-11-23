import { STATUS_LABEL, STATUS_TONE, type OrderStatus } from "@/lib/domain/order-status";

const TONES = {
  neutral: "bg-creme-100/10 text-creme-100",
  warning: "bg-creme-300/15 text-creme-300",
  success: "bg-emerald-400/15 text-emerald-200",
  info: "bg-sky-400/15 text-sky-200",
  danger: "bg-amora-300/20 text-amora-100",
} as const;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${TONES[STATUS_TONE[status]]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
