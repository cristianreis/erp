import React from "react";
import { useListStockMovements } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StockMovements() {
  const { data: movements = [], isLoading } = useListStockMovements();

  const columns = [
    { key: "movementDate", header: "Data/Hora", render: (r: any) => format(new Date(r.movementDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "productCode", header: "Código", className: "font-mono text-xs" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "warehouseName", header: "Almoxarifado" },
    { key: "movementType", header: "Tipo", render: (r: any) => <StatusBadge status={r.movementType} /> },
    {
      key: "quantity", header: "Quantidade", className: "text-right font-medium",
      render: (r: any) => {
        const isOut = r.movementType.startsWith("saida") || r.movementType === "baixa_venda" || r.movementType === "perda_sucata";
        return <span className={isOut ? "text-red-600" : "text-emerald-700"}>{isOut ? "-" : "+"}{parseFloat(r.quantity).toFixed(2)}</span>;
      }
    },
    { key: "referenceType", header: "Referência", render: (r: any) => r.referenceType ?? "–" },
    { key: "notes", header: "Obs.", render: (r: any) => r.notes ?? "–" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Movimentações de Estoque" description="Histórico de todas as movimentações de estoque." />
      <DataTable data={movements as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma movimentação registrada." />
    </div>
  );
}
