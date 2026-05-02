import React from "react";
import { useGetDashboardLowStock } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function LowStockReport() {
  const { data: rows = [], isLoading } = useGetDashboardLowStock();

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "category", header: "Categoria", render: (r: any) => r.category ?? "–" },
    { key: "availableStock", header: "Disponível", className: "text-right", render: (r: any) => <span className="text-red-600 font-semibold">{parseFloat(r.availableStock ?? 0).toFixed(2)} {r.unit}</span> },
    { key: "minimumStock", header: "Mínimo", className: "text-right text-muted-foreground", render: (r: any) => `${parseFloat(r.minimumStock ?? 0).toFixed(2)} ${r.unit}` },
    { key: "shortage", header: "Déficit", className: "text-right", render: (r: any) => <span className="text-red-700 font-bold">{parseFloat(r.shortage ?? 0).toFixed(2)}</span> },
    { key: "urgency", header: "Urgência", render: (r: any) => {
      const pct = parseFloat(r.availableStock ?? 0) / Math.max(parseFloat(r.minimumStock ?? 1), 0.01);
      if (pct === 0) return <Badge className="bg-red-100 text-red-800">Sem Estoque</Badge>;
      if (pct < 0.5) return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
      return <Badge className="bg-amber-100 text-amber-800">Baixo</Badge>;
    }},
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Relatório: Estoque Baixo" description="Produtos abaixo do nível mínimo de estoque." />
      {!isLoading && (rows as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-400" />
          <p className="text-lg font-medium">Nenhum produto com estoque abaixo do mínimo!</p>
        </div>
      ) : (
        <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum item com estoque crítico." />
      )}
    </div>
  );
}
