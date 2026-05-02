import React from "react";
import { useListStockReservations } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function StockReservations() {
  const { data: rows = [], isLoading } = useListStockReservations();

  const columns = [
    { key: "salesOrderNumber", header: "Pedido de Venda", className: "font-mono text-xs w-[130px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "warehouseName", header: "Almoxarifado", render: (r: any) => r.warehouseName ?? "–" },
    { key: "quantity", header: "Qtd Reservada", className: "text-right font-medium", render: (r: any) => parseFloat(r.quantity).toFixed(2) },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "reservationDate", header: "Data", render: (r: any) => format(new Date(r.reservationDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reservas de Estoque" description="Materiais reservados para pedidos de venda em aberto." />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma reserva de estoque encontrada." />
    </div>
  );
}
