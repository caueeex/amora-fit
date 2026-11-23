"use client";

import { useState, useTransition } from "react";
import { AdminButton, AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui";
import { ALLOWED_TRANSITIONS, type OrderStatus } from "@/lib/domain/order-status";
import { changeOrderStatusAction, updateShipmentAction } from "../actions";

type Shipment = { carrier: string | null; tracking_code: string | null; tracking_url: string | null } | undefined;

/** Rótulo do botão para cada destino. */
const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  AWAITING_PAYMENT: "Aguardar pagamento",
  PAID: "Confirmar pagamento",
  PROCESSING: "Iniciar preparação",
  INVOICED: "Marcar como faturado",
  SHIPPED: "Registrar envio",
  COMPLETED: "Marcar como concluído",
  CANCELLED: "Cancelar pedido",
};

const HELP: Partial<Record<OrderStatus, string>> = {
  AWAITING_PAYMENT: "Use quando já conversou com a cliente e está esperando o pagamento.",
  PAID: "Dá baixa definitiva no estoque das peças deste pedido.",
  PROCESSING: "Peças sendo separadas e embaladas.",
  INVOICED: "Marcação interna de faturamento (não emite nota fiscal).",
  SHIPPED: "Informe transportadora e rastreio para a cliente acompanhar.",
  COMPLETED: "Pedido entregue.",
  CANCELLED: "As peças voltam ao estoque automaticamente.",
};

export function OrderActions({ orderId, status, shipment }: { orderId: string; status: OrderStatus; shipment: Shipment }) {
  const [selected, setSelected] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState("pix");
  const [ship, setShip] = useState({ carrier: shipment?.carrier ?? "", tracking_code: shipment?.tracking_code ?? "", tracking_url: shipment?.tracking_url ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [editShip, setEditShip] = useState(false);

  const targets = ALLOWED_TRANSITIONS[status];
  const forward = targets.filter((t) => t !== "CANCELLED");
  const canCancel = targets.includes("CANCELLED");

  function open(t: OrderStatus) {
    setSelected(t);
    setError(null);
    setDone(null);
    setNote("");
  }

  function submit() {
    if (!selected) return;
    if (selected === "CANCELLED" && !window.confirm("Cancelar este pedido? Esta ação não pode ser desfeita.")) return;
    start(async () => {
      const r = await changeOrderStatusAction({
        orderId,
        to: selected,
        note: note || undefined,
        paymentMethod: selected === "PAID" ? method : undefined,
        shipment: selected === "SHIPPED" ? ship : undefined,
      });
      if (r.ok) {
        setDone(`${ACTION_LABEL[selected]}: feito.`);
        setSelected(null);
      } else setError(r.error);
    });
  }

  function saveShipment() {
    start(async () => {
      const r = await updateShipmentAction({ orderId, ...ship });
      if (r.ok) {
        setDone("Dados de envio atualizados.");
        setEditShip(false);
      } else setError(r.error);
    });
  }

  if (!targets.length && status !== "SHIPPED" && status !== "COMPLETED") {
    return <p className="text-sm text-amora-900/60">Pedido finalizado. Nenhuma ação disponível.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {done && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">✓ {done}</p>}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}

      {targets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {forward.map((t) => (
            <AdminButton key={t} variant={selected === t ? "primary" : t === forward[forward.length - 1] && forward.length > 1 ? "secondary" : "primary"} onClick={() => open(t)}>
              {ACTION_LABEL[t]}
            </AdminButton>
          ))}
          {canCancel && (
            <AdminButton variant="danger" onClick={() => open("CANCELLED")}>
              {ACTION_LABEL.CANCELLED}
            </AdminButton>
          )}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-3 rounded-xl border border-amora-900/10 bg-amora-100/20 p-4">
          <p className="text-sm font-semibold text-amora-950">{ACTION_LABEL[selected]}</p>
          {HELP[selected] && <p className="-mt-2 text-xs text-amora-900/60">{HELP[selected]}</p>}

          {selected === "PAID" && (
            <AdminSelect label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="pix">Pix</option>
              <option value="credit_card">Cartão de crédito</option>
              <option value="debit_card">Cartão de débito</option>
              <option value="cash">Dinheiro</option>
              <option value="bank_transfer">Transferência</option>
              <option value="other">Outro</option>
            </AdminSelect>
          )}

          {selected === "SHIPPED" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminInput label="Transportadora" placeholder="Correios, motoboy…" value={ship.carrier} onChange={(e) => setShip((s) => ({ ...s, carrier: e.target.value }))} />
              <AdminInput label="Código de rastreio" value={ship.tracking_code} onChange={(e) => setShip((s) => ({ ...s, tracking_code: e.target.value }))} />
              <AdminInput className="sm:col-span-2" label="Link de rastreio (opcional)" placeholder="https://…" value={ship.tracking_url} onChange={(e) => setShip((s) => ({ ...s, tracking_url: e.target.value }))} />
            </div>
          )}

          <AdminTextarea
            label={selected === "CANCELLED" ? "Motivo do cancelamento (obrigatório)" : "Observação (opcional, aparece para a cliente)"}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-2">
            <AdminButton variant={selected === "CANCELLED" ? "danger" : "primary"} loading={pending} onClick={submit}>
              Confirmar
            </AdminButton>
            <AdminButton variant="ghost" onClick={() => setSelected(null)}>
              Voltar
            </AdminButton>
          </div>
        </div>
      )}

      {(status === "SHIPPED" || status === "COMPLETED") && (
        <div>
          {!editShip ? (
            <AdminButton variant="ghost" onClick={() => setEditShip(true)}>
              Editar dados de envio
            </AdminButton>
          ) : (
            <div className="flex flex-col gap-3 rounded-xl border border-amora-900/10 bg-amora-100/20 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminInput label="Transportadora" value={ship.carrier} onChange={(e) => setShip((s) => ({ ...s, carrier: e.target.value }))} />
                <AdminInput label="Código de rastreio" value={ship.tracking_code} onChange={(e) => setShip((s) => ({ ...s, tracking_code: e.target.value }))} />
                <AdminInput className="sm:col-span-2" label="Link de rastreio" placeholder="https://…" value={ship.tracking_url} onChange={(e) => setShip((s) => ({ ...s, tracking_url: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <AdminButton loading={pending} onClick={saveShipment}>
                  Salvar
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setEditShip(false)}>
                  Cancelar
                </AdminButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
