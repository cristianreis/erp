import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListQualityInspections, useCreateQualityInspection, useListProducts, useListProductionOrders } from "@workspace/api-client-react";
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RESULTS = [
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado_parcial", label: "Reprovado Parcial" },
  { value: "reprovado_total", label: "Reprovado Total" },
];

type InspForm = { productId: string; productionOrderId: string; inspectedQuantity: string; approvedQuantity: string; rejectedQuantity: string; status: string; notes: string; };
const dfv: InspForm = { productId: "", productionOrderId: "", inspectedQuantity: "0", approvedQuantity: "0", rejectedQuantity: "0", status: "aprovado", notes: "" };

export default function QualityInspections() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: rows = [], isLoading } = useListQualityInspections();
  const { data: products = [] } = useListProducts();
  const { data: ops = [] } = useListProductionOrders();
  const createM = useCreateQualityInspection({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/quality/inspections"] }); toast({ title: "Inspeção registrada!" }); setDialogOpen(false); } } });
  const form = useForm<InspForm>({ defaultValues: dfv });
  const onSubmit = (data: InspForm) => createM.mutate({ data: { ...data, productionOrderId: data.productionOrderId || null } as any });

  const columns = [
    { key: "inspectionDate", header: "Data", render: (r: any) => format(new Date(r.inspectionDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "productCode", header: "Código", className: "font-mono text-xs" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "inspectedQuantity", header: "Inspecionado", className: "text-right", render: (r: any) => parseFloat(r.inspectedQuantity).toFixed(0) },
    { key: "approvedQuantity", header: "Aprovado", className: "text-right text-emerald-700 font-medium", render: (r: any) => parseFloat(r.approvedQuantity).toFixed(0) },
    { key: "rejectedQuantity", header: "Reprovado", className: "text-right text-red-600 font-medium", render: (r: any) => parseFloat(r.rejectedQuantity).toFixed(0) },
    { key: "status", header: "Resultado", render: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Inspeções de Qualidade" description="Registro e controle de inspeções de qualidade." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Nova Inspeção" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma inspeção registrada." />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova Inspeção de Qualidade</DialogTitle></DialogHeader>
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
              <FormField control={form.control} name="productionOrderId" render={({ field }) => (
                <FormItem><FormLabel>OP (opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="">Nenhuma</SelectItem>{(ops as any[]).map(o => <SelectItem key={o.id} value={o.id}>{o.orderNumber} – {o.productName}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="inspectedQuantity" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Inspecionado *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="approvedQuantity" render={({ field }) => (
                  <FormItem><FormLabel>Aprovado</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="rejectedQuantity" render={({ field }) => (
                  <FormItem><FormLabel>Reprovado</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Resultado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{RESULTS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
