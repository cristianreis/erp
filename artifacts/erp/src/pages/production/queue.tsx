import React from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListProductionOrders, useStartProductionOrder, useFinishProductionOrder } from "@workspace/api-client-react";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Play, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Props { orderType: "usinagem" | "montagem"; title: string; description: string; }

export function ProductionQueue({ orderType, title, description }: Props) {
  const qc = useQueryClient();
  const [finishRow, setFinishRow] = useState<any>(null);
  const [finishQty, setFinishQty] = useState("0");
  const { data: all = [], isLoading } = useListProductionOrders({ order_type: orderType });
  const startM = useStartProductionOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "OP iniciada!" }); } } });
  const finishM = useFinishProductionOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "OP finalizada!" }); setFinishRow(null); } } });

  const active = safeArray(all).filter(o => !["finalizada", "cancelada"].includes(o.status));

  const columns = [
    { key: "orderNumber", header: "OP", className: "font-mono text-xs w-[100px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium text-xs">{r.productCode} – {r.productName}</span> },
    { key: "priority", header: "Prioridade", render: (r: any) => <StatusBadge status={r.priority} /> },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "quantityPlanned", header: "Planejado", className: "text-right", render: (r: any) => parseFloat(r.quantityPlanned).toFixed(0) },
    { key: "quantityProduced", header: "Produzido", className: "text-right text-emerald-700", render: (r: any) => parseFloat(r.quantityProduced ?? 0).toFixed(0) },
    { key: "plannedEndDate", header: "Prazo", render: (r: any) => r.plannedEndDate ? format(new Date(r.plannedEndDate), "dd/MM/yy", { locale: ptBR }) : "–" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} description={description} />
      <DataTable
        data={active}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={`Nenhuma OP de ${orderType} em andamento.`}
        actions={row => (
          <div className="flex gap-1 justify-end">
            {["planejada", "liberada"].includes((row as any).status) && (
              <Button size="icon" variant="ghost" className="text-blue-600" title="Iniciar" onClick={() => startM.mutate({ id: (row as any).id })}>
                <Play className="h-4 w-4" />
              </Button>
            )}
            {(row as any).status === "em_producao" && (
              <Button size="icon" variant="ghost" className="text-emerald-600" title="Finalizar" onClick={() => { setFinishRow(row); setFinishQty(String((row as any).quantityPlanned)); }}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />
      <Dialog open={!!finishRow} onOpenChange={o => !o && setFinishRow(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalizar OP {finishRow?.orderNumber}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Quantidade Produzida (boa)</label>
              <Input type="number" step="0.01" value={finishQty} onChange={e => setFinishQty(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishRow(null)}>Cancelar</Button>
            <Button onClick={() => finishM.mutate({ id: finishRow.id, data: { quantityProduced: parseFloat(finishQty), quantityRejected: 0 } as any })} disabled={finishM.isPending}>Finalizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
