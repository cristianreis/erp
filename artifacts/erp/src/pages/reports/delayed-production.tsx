import React from "react";
import { useGetDashboardProductionDelayed } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function DelayedProductionReport() {
  const { data: rows = [], isLoading } = useGetDashboardProductionDelayed();

  const columns = [
    { key: "orderNumber", header: "OP", className: "font-mono text-xs w-[100px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productCode} – {r.productName}</span> },
    { key: "orderType", header: "Tipo", render: (r: any) => r.orderType ?? "–" },
    { key: "priority", header: "Prioridade", render: (r: any) => <StatusBadge status={r.priority} /> },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "plannedEndDate", header: "Prazo", render: (r: any) => r.plannedEndDate ? format(new Date(r.plannedEndDate), "dd/MM/yy", { locale: ptBR }) : "–" },
    { key: "delay", header: "Atraso", render: (r: any) => {
      if (!r.plannedEndDate) return "–";
      const days = differenceInDays(new Date(), new Date(r.plannedEndDate));
      return <Badge className={days > 7 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{days} {days === 1 ? "dia" : "dias"}</Badge>;
    }},
    { key: "quantityPlanned", header: "Qtd Plan.", className: "text-right", render: (r: any) => parseFloat(r.quantityPlanned).toFixed(0) },
    { key: "quantityProduced", header: "Qtd Prod.", className: "text-right text-emerald-700", render: (r: any) => parseFloat(r.quantityProduced ?? 0).toFixed(0) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Relatório: Produção Atrasada" description="Ordens de produção que ultrapassaram o prazo planejado." />
      {!isLoading && (rows as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-400" />
          <p className="text-lg font-medium">Nenhuma ordem de produção em atraso!</p>
        </div>
      ) : (
        <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma OP em atraso." />
      )}
    </div>
  );
}
