import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProductionOrders, useCreateProductionOrder,
  useStartProductionOrder, useFinishProductionOrder,
  useListProducts, useListSalesOrders,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Play, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ORDER_TYPES = [
  { value: "usinagem", label: "Usinagem" },
  { value: "montagem", label: "Montagem" },
  { value: "fabricacao", label: "Fabricação" },
  { value: "retrabalho", label: "Retrabalho" },
];
const PRIORITIES = [
  { value: "baixa", label: "Baixa" }, { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" }, { value: "urgente", label: "Urgente" },
];

type OrderForm = { productId: string; orderType: string; priority: string; quantityPlanned: string; salesOrderId: string; plannedStartDate: string; plannedEndDate: string; notes: string; };
const dfv: OrderForm = { productId: "", orderType: "usinagem", priority: "normal", quantityPlanned: "1", salesOrderId: "", plannedStartDate: "", plannedEndDate: "", notes: "" };

export default function ProductionOrders() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [finishRow, setFinishRow] = useState<any>(null);
  const [finishQty, setFinishQty] = useState("0");
  const { data: orders = [], isLoading } = useListProductionOrders();
  const { data: products = [] } = useListProducts();
  const { data: salesOrders = [] } = useListSalesOrders();
  const createM = useCreateProductionOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "OP criada!" }); setDialogOpen(false); } } });
  const startM = useStartProductionOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "OP iniciada!" }); } } });
  const finishM = useFinishProductionOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/production-orders"] }); toast({ title: "OP finalizada!" }); setFinishRow(null); } } });
  const form = useForm<OrderForm>({ defaultValues: dfv });

  const onSubmit = (data: OrderForm) => {
    const payload = { ...data, salesOrderId: data.salesOrderId || null, plannedStartDate: data.plannedStartDate || null, plannedEndDate: data.plannedEndDate || null };
    createM.mutate({ data: payload as any });
  };

  const columns = [
    { key: "orderNumber", header: "OP", className: "font-mono text-xs w-[100px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium text-xs">{r.productCode} – {r.productName}</span> },
    { key: "orderType", header: "Tipo", render: (r: any) => ORDER_TYPES.find(t => t.value === r.orderType)?.label ?? r.orderType },
    { key: "priority", header: "Prioridade", render: (r: any) => <StatusBadge status={r.priority} /> },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "quantityPlanned", header: "Qtd", className: "text-right", render: (r: any) => `${parseFloat(r.quantityPlanned).toFixed(0)} / ${parseFloat(r.quantityProduced ?? "0").toFixed(0)}` },
    { key: "plannedEndDate", header: "Prazo", render: (r: any) => r.plannedEndDate ? format(new Date(r.plannedEndDate), "dd/MM/yy", { locale: ptBR }) : "–" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ordens de Produção" description="Planejamento e controle das ordens de produção." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Nova OP" />
      <DataTable data={orders as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma OP encontrada."
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ordem de Produção</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Produto *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>{(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="orderType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{ORDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem><FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantityPlanned" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="salesOrderId" render={({ field }) => (
                <FormItem><FormLabel>Pedido de Venda (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {(salesOrders as any[]).map(o => <SelectItem key={o.id} value={o.id}>{o.orderNumber} – {o.customerName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="plannedStartDate" render={({ field }) => (
                  <FormItem><FormLabel>Início Planejado</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="plannedEndDate" render={({ field }) => (
                  <FormItem><FormLabel>Fim Planejado</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Criar OP</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
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
