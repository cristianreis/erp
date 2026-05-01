import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListReceipts, useCreateReceipt, useListPurchaseOrders, useListWarehouses, useListProducts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ItemForm = { productId: string; quantity: string; warehouseId: string; };
type ReceiptForm = { purchaseOrderId: string; notes: string; items: ItemForm[]; };
const dfv: ReceiptForm = { purchaseOrderId: "", notes: "", items: [{ productId: "", quantity: "1", warehouseId: "" }] };

export default function Receipts() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: rows = [], isLoading } = useListReceipts();
  const { data: pos = [] } = useListPurchaseOrders();
  const { data: warehouses = [] } = useListWarehouses();
  const { data: products = [] } = useListProducts();
  const createM = useCreateReceipt({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/receipts"] }); qc.invalidateQueries({ queryKey: ["/api/stock/balances"] }); toast({ title: "Recebimento registrado!" }); setDialogOpen(false); } } });
  const form = useForm<ReceiptForm>({ defaultValues: dfv });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const onSubmit = (data: ReceiptForm) => createM.mutate({ data: data as any });

  const columns = [
    { key: "receiptNumber", header: "Nº Receb.", className: "font-mono text-xs w-[100px]" },
    { key: "receiptDate", header: "Data", render: (r: any) => format(new Date(r.receiptDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "status", header: "Status", render: (r: any) => <Badge className="bg-emerald-100 text-emerald-800">{r.status}</Badge> },
    { key: "notes", header: "Obs.", render: (r: any) => r.notes ?? "–" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Recebimentos de Compra" description="Registro de recebimentos de materiais comprados." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Registrar Recebimento" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum recebimento registrado." />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Recebimento</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="purchaseOrderId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Pedido de Compra *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>{(pos as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.orderNumber} – {p.supplierName}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Itens Recebidos</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ productId: "", quantity: "1", warehouseId: "" })}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4"><FormField control={form.control} name={`items.${i}.productId`} rules={{ required: true }} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Produto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                          <SelectContent>{(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} /></div>
                    <div className="col-span-2"><FormField control={form.control} name={`items.${i}.quantity`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Qtd</FormLabel><FormControl><Input type="number" step="0.01" className="text-xs" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="col-span-5"><FormField control={form.control} name={`items.${i}.warehouseId`} rules={{ required: true }} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Almoxarifado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                          <SelectContent>{(warehouses as any[]).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} /></div>
                    <div className="col-span-1 pb-1"><Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(i)}><X className="h-3 w-3" /></Button></div>
                  </div>
                ))}
              </div>
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
