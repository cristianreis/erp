import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSalesOrders } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Truck } from "lucide-react";

export default function Shipping() {
  const { data: all = [], isLoading } = useListSalesOrders({ status: "aprovado" });
  const ready = (all as any[]).filter(o => ["aprovado", "pronto_expedicao", "em_producao"].includes(o.status));

  const columns = [
    { key: "orderNumber", header: "Pedido", className: "font-mono text-xs w-[100px]" },
    { key: "customerName", header: "Cliente", render: (r: any) => <span className="font-medium">{r.customerName}</span> },
    { key: "orderDate", header: "Data Pedido", render: (r: any) => format(new Date(r.orderDate), "dd/MM/yy", { locale: ptBR }) },
    { key: "deliveryDate", header: "Prazo Entrega", render: (r: any) => r.deliveryDate ? format(new Date(r.deliveryDate), "dd/MM/yy", { locale: ptBR }) : "–" },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "totalAmount", header: "Total (R$)", className: "text-right font-medium", render: (r: any) => `R$ ${parseFloat(r.totalAmount ?? 0).toFixed(2)}` },
    { key: "shippingAddress", header: "Endereço de Entrega", render: (r: any) => r.shippingAddress ?? <span className="text-muted-foreground text-xs">Não informado</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Expedição" description="Pedidos aprovados aguardando expedição e entrega ao cliente." />
      {ready.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Truck className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhum pedido pronto para expedição.</p>
        </div>
      ) : (
        <DataTable data={ready} columns={columns} isLoading={isLoading} emptyMessage="Nenhum pedido aguardando expedição." />
      )}
    </div>
  );
}
