import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListPurchaseRequests, useCreatePurchaseRequest, useApprovePurchaseRequest, useListProducts } from "@workspace/api-client-react";
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
import { CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReqForm = { productId: string; quantity: string; neededDate: string; source: string; notes: string; };
const dfv: ReqForm = { productId: "", quantity: "1", neededDate: "", source: "manual", notes: "" };
const SOURCES = [{ value: "manual", label: "Manual" }, { value: "mrp", label: "MRP" }, { value: "estoque_minimo", label: "Estoque Mínimo" }, { value: "producao", label: "Produção" }];

export default function PurchaseRequests() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: rows = [], isLoading } = useListPurchaseRequests();
  const { data: products = [] } = useListProducts();
  const createM = useCreatePurchaseRequest({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-requests"] }); toast({ title: "Solicitação criada!" }); setDialogOpen(false); } } });
  const approveM = useApprovePurchaseRequest({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-requests"] }); toast({ title: "Aprovada!" }); } } });
  const form = useForm<ReqForm>({ defaultValues: dfv });
  const onSubmit = (data: ReqForm) => createM.mutate({ data: { ...data, neededDate: data.neededDate || null } as any });

  const columns = [
    { key: "requestNumber", header: "Nº SC", className: "font-mono text-xs w-[100px]" },
    { key: "productCode", header: "Código", className: "font-mono text-xs" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "quantity", header: "Qtd", className: "text-right", render: (r: any) => parseFloat(r.quantity).toFixed(2) },
    { key: "source", header: "Origem", render: (r: any) => SOURCES.find(s => s.value === r.source)?.label ?? r.source },
    { key: "neededDate", header: "Necessidade", render: (r: any) => r.neededDate ? format(new Date(r.neededDate), "dd/MM/yy", { locale: ptBR }) : "–" },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Solicitações de Compra" description="Solicitações de reposição de materiais." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Nova Solicitação" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma solicitação encontrada."
        actions={row => (
          <div className="flex gap-1 justify-end">
            {(row as any).status === "aberta" && (
              <Button size="icon" variant="ghost" className="text-emerald-600" title="Aprovar" onClick={() => approveM.mutate({ id: (row as any).id })}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Solicitação de Compra</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="neededDate" render={({ field }) => (
                  <FormItem><FormLabel>Data necessidade</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="source" render={({ field }) => (
                <FormItem><FormLabel>Origem</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{SOURCES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Criar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
