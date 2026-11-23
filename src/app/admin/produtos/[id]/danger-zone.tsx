"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminButton, Card, CardTitle } from "@/components/admin/ui";
import type { ProductStatus } from "@/lib/admin/product-status";
import { deleteProductAction, setProductStatusAction } from "../actions";

export function DangerZone({ productId, status, hasOrders }: { productId: string; status: ProductStatus; hasOrders: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card className="mb-20 border-red-900/15">
      <CardTitle>Retirar da loja</CardTitle>
      <div className="flex flex-wrap items-center gap-3">
        {status !== "archived" ? (
          <AdminButton
            variant="secondary"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await setProductStatusAction(productId, "archived");
                if (!r.ok) setError(r.error);
              })
            }
          >
            Arquivar produto
          </AdminButton>
        ) : (
          <AdminButton
            variant="secondary"
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await setProductStatusAction(productId, "draft");
                if (!r.ok) setError(r.error);
              })
            }
          >
            Desarquivar (volta como rascunho)
          </AdminButton>
        )}
        <AdminButton
          variant="danger"
          disabled={hasOrders || pending}
          title={hasOrders ? "Produtos já vendidos não podem ser excluídos" : undefined}
          onClick={() => {
            if (!window.confirm("Excluir este produto definitivamente, com fotos e variações?")) return;
            start(async () => {
              const r = await deleteProductAction(productId);
              if (r.ok) router.push("/admin/produtos");
              else setError(r.error);
            });
          }}
        >
          Excluir definitivamente
        </AdminButton>
      </div>
      <p className="mt-3 text-xs text-amora-900/55">
        {hasOrders
          ? "Este produto já tem pedidos: ele pode ser arquivado (sai da loja e mantém o histórico), mas não excluído."
          : "Arquivar tira o produto da loja sem apagar nada. Excluir apaga produto, variações e fotos."}
      </p>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </Card>
  );
}
