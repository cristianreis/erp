import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListMrpRuns, useRunMrp, useGetMrpRun, useApproveMrpRun } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, CheckCircle2, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  usar_estoque: "Usar Estoque",
  montar: "Montar",
  usinar: "Usinar",
  fabricar: "Fabricar",
  comprar: "Comprar",
  fundir_comprar: "Fundir/Comprar",
  sem_acao: "Sem Ação",
};

const ACTION_COLORS: Record<string, string> = {
  usar_estoque: "bg-emerald-100 text-emerald-800",
  montar: "bg-blue-100 text-blue-800",
  usinar: "bg-blue-100 text-blue-800",
  fabricar: "bg-indigo-100 text-indigo-800",
  comprar: "bg-amber-100 text-amber-800",
  fundir_comprar: "bg-orange-100 text-orange-800",
  sem_acao: "bg-gray-100 text-gray-600",
};

function MrpResults({ runId }: { runId: string }) {
  const { data, isLoading } = useGetMrpRun(runId);
  const results = (data as any)?.results ?? [];

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium text-sm">{r.productName}</span> },
    { key: "grossRequirement", header: "Demanda Bruta", className: "text-right", render: (r: any) => parseFloat(r.grossRequirement).toFixed(2) },
    { key: "availableStock", header: "Em Estoque", className: "text-right text-emerald-700", render: (r: any) => parseFloat(r.availableStock).toFixed(2) },
    { key: "reservedStock", header: "Reservado", className: "text-right text-amber-600", render: (r: any) => parseFloat(r.reservedStock).toFixed(2) },
    { key: "openProductionQuantity", header: "Em Prod.", className: "text-right text-blue-600", render: (r: any) => parseFloat(r.openProductionQuantity).toFixed(2) },
    { key: "openPurchaseQuantity", header: "Em Compra", className: "text-right text-blue-600", render: (r: any) => parseFloat(r.openPurchaseQuantity).toFixed(2) },
    { key: "netRequirement", header: "Neces. Líquida", className: "text-right font-bold", render: (r: any) => {
      const v = parseFloat(r.netRequirement);
      return <span className={v > 0 ? "text-red-600" : "text-gray-400"}>{v.toFixed(2)}</span>;
    }},
    { key: "suggestedAction", header: "Ação Sugerida", render: (r: any) => (
      <Badge className={`text-xs ${ACTION_COLORS[r.suggestedAction] ?? "bg-gray-100 text-gray-600"}`}>
        {ACTION_LABELS[r.suggestedAction] ?? r.suggestedAction}
      </Badge>
    )},
    { key: "suggestedQuantity", header: "Qtd. Sugerida", className: "text-right", render: (r: any) => parseFloat(r.suggestedQuantity) > 0 ? parseFloat(r.suggestedQuantity).toFixed(2) : "–" },
  ];

  return <DataTable data={results} columns={columns} isLoading={isLoading} emptyMessage="Nenhum resultado para este cálculo." />;
}

export default function MrpPage() {
  const qc = useQueryClient();
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [consideredSalesOrders, setConsideredSalesOrders] = useState(true);
  const [consideredMinimumStock, setConsideredMinimumStock] = useState(true);
  const { data: runs = [], isLoading } = useListMrpRuns();
  const runM = useRunMrp({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: ["/api/mrp/runs"] });
        const run = data?.run ?? data;
        toast({ title: `MRP calculado!`, description: `Análise concluída.` });
        if (run?.id) setSelectedRun(run.id);
        setRunDialogOpen(false);
      }
    }
  });
  const approveM = useApproveMrpRun({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/mrp/runs"] }); toast({ title: "MRP aprovado!" }); } } });

  const runsColumns = [
    { key: "runNumber", header: "Cálculo", className: "font-mono text-xs w-[100px]" },
    { key: "runDate", header: "Data/Hora", render: (r: any) => format(new Date(r.runDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="MRP — Planejamento de Necessidades" description="Cálculo automático de necessidades de materiais e produção.">
        <Button onClick={() => setRunDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Zap className="h-4 w-4 mr-2" /> Rodar MRP
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="text-sm font-semibold">Histórico de Cálculos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={runs as any[]}
              columns={runsColumns}
              isLoading={isLoading}
              emptyMessage="Nenhum cálculo realizado."
              actions={row => (
                <div className="flex gap-1 justify-end">
                  <Button size="icon" variant="ghost" title="Ver Resultados" onClick={() => setSelectedRun((row as any).id)}>
                    <List className="h-4 w-4" />
                  </Button>
                  {(row as any).status === "calculado" && (
                    <Button size="icon" variant="ghost" className="text-emerald-600" title="Aprovar" onClick={() => approveM.mutate({ id: (row as any).id })}>
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {selectedRun ? `Resultados do Cálculo` : "Selecione um cálculo para ver os resultados"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            {selectedRun ? <MrpResults runId={selectedRun} /> : (
              <div className="py-12 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 text-indigo-300" />
                <p>Selecione um cálculo à esquerda ou rode um novo MRP.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rodar MRP</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">O MRP irá calcular as necessidades líquidas de todos os produtos com base em pedidos de venda abertos, estoque disponível, e ordens em andamento.</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Switch checked={consideredSalesOrders} onCheckedChange={setConsideredSalesOrders} id="sales" />
                <Label htmlFor="sales">Considerar pedidos de venda abertos</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={consideredMinimumStock} onCheckedChange={setConsideredMinimumStock} id="minstock" />
                <Label htmlFor="minstock">Considerar estoque mínimo de segurança</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRunDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => runM.mutate({ data: { consideredSalesOrders, consideredMinimumStock } as any })}
              disabled={runM.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {runM.isPending ? "Calculando..." : "Calcular MRP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
