import React from "react";
import { safeArray } from "@/lib/safe-array";
import { useListPurchaseOrders } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PendingPurchasesReport() {
  const { data: all = [], isLoading } = useListPurchaseOrders();
  const pending = safeArray(all).filter(o => !["recebido_total", "cancelado"].includes(o.status));

  const columns = [
    { key: "orderNumber", header: "Pedido", className: "font-mono text-xs w-[100px]" },
    { key: "supplierName", header: "Fornecedor", render: (r: any) => <span className="font-medium">{r.supplierName}</span> },
    { key: "orderDate", header: "Emissão", render: (r: any) => format(new Date(r.orderDate), "dd/MM/yy", { locale: ptBR }) },
    { key: "expectedDate", header: "Previsão Entrega", render: (r: any) => {
      if (!r.expectedDate) return "–";
      const late = isPast(new Date(r.expectedDate));
      return <span className={late ? "text-red-600 font-semibold" : ""}>{format(new Date(r.expectedDate), "dd/MM/yy", { locale: ptBR })}</span>;
    }},
    { key: "delay", header: "Situação", render: (r: any) => {
      if (!r.expectedDate) return <Badge className="bg-gray-100 text-gray-600">Sem prazo</Badge>;
      const days = differenceInDays(new Date(), new Date(r.expectedDate));
      if (days > 0) return <Badge className="bg-red-100 text-red-800">{days}d atraso</Badge>;
      if (days === 0) return <Badge className="bg-amber-100 text-amber-800">Vence hoje</Badge>;
      return <Badge className="bg-emerald-100 text-emerald-800">No prazo</Badge>;
    }},
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "totalAmount", header: "Total (R$)", className: "text-right font-medium", render: (r: any) => `R$ ${parseFloat(r.totalAmount ?? 0).toFixed(2)}` },
  ];

  const totalPending = pending.reduce((s, o) => s + parseFloat(o.totalAmount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Relatório: Compras Pendentes" description="Pedidos de compra ainda não totalmente recebidos.">
        {pending.length > 0 && (
          <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-md">
            Total em aberto: <span className="text-foreground font-bold">R$ {totalPending.toFixed(2)}</span>
          </div>
        )}
      </PageHeader>
      {!isLoading && pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-400" />
          <p className="text-lg font-medium">Nenhum pedido de compra pendente!</p>
        </div>
      ) : (
        <DataTable data={pending} columns={columns} isLoading={isLoading} emptyMessage="Nenhum pedido pendente." />
      )}
    </div>
  );
}
