import React from "react";
import { useListMrpRuns, useGetMrpRun } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Factory } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PROD_ACTIONS = ["montar", "usinar", "fabricar"];

function MrpProductionNeeds({ runId }: { runId: string }) {
  const { data, isLoading } = useGetMrpRun(runId);
  const results = ((data as any)?.results ?? []).filter((r: any) => PROD_ACTIONS.includes(r.suggestedAction) && parseFloat(r.netRequirement) > 0);

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "grossRequirement", header: "Demanda Bruta", className: "text-right", render: (r: any) => parseFloat(r.grossRequirement).toFixed(2) },
    { key: "availableStock", header: "Em Estoque", className: "text-right text-emerald-700", render: (r: any) => parseFloat(r.availableStock).toFixed(2) },
    { key: "netRequirement", header: "Neces. Líquida", className: "text-right font-bold text-red-600", render: (r: any) => parseFloat(r.netRequirement).toFixed(2) },
    { key: "suggestedAction", header: "Ação", render: (r: any) => {
      const map: Record<string, string> = { montar: "Montar", usinar: "Usinar", fabricar: "Fabricar" };
      return <Badge className="bg-blue-100 text-blue-800 text-xs">{map[r.suggestedAction] ?? r.suggestedAction}</Badge>;
    }},
    { key: "suggestedQuantity", header: "Qtd a Produzir", className: "text-right font-semibold", render: (r: any) => parseFloat(r.suggestedQuantity).toFixed(2) },
    { key: "dueDate", header: "Prazo", render: (r: any) => r.dueDate ? format(new Date(r.dueDate), "dd/MM/yy", { locale: ptBR }) : "–" },
  ];

  if (results.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Factory className="h-12 w-12 mb-3 text-gray-300" />
        <p>Nenhuma necessidade de produção identificada neste cálculo.</p>
      </div>
    );
  }
  return <DataTable data={results} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma necessidade de produção." />;
}

export default function ProductionNeeds() {
  const { data: runs = [], isLoading } = useListMrpRuns();
  const lastRun = (runs as any[])[0];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Necessidades de Produção" description="Itens que precisam ser fabricados conforme último cálculo MRP." />
      {isLoading && <div className="text-center py-10 text-muted-foreground">Carregando cálculos MRP...</div>}
      {!isLoading && !lastRun && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Factory className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Nenhum cálculo MRP realizado ainda.</p>
          <p className="text-sm">Acesse PCP &amp; MRP → Rodar MRP para calcular as necessidades.</p>
        </div>
      )}
      {lastRun && (
        <div className="flex flex-col gap-2">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-2 px-4">
              <span className="text-xs text-blue-700 font-medium">
                Baseado no cálculo {lastRun.runNumber} — {format(new Date(lastRun.runDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                {" · "}Status: <span className="capitalize">{lastRun.status}</span>
              </span>
            </CardContent>
          </Card>
          <MrpProductionNeeds runId={lastRun.id} />
        </div>
      )}
    </div>
  );
}
