import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSalesOrders, useCreateSalesOrder,
  useListCustomers, useListProducts,
  useApproveSalesOrder,
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
import { useForm, useFieldArray } from "react-hook-form";
import { CheckCircle2, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ItemForm = { productId: string; quantity: string; unitPrice: string; };
type OrderForm = { customerId: string; expectedDeliveryDate: string; notes: string; items: ItemForm[]; };
const dfv: OrderForm = { customerId: "", expectedDeliveryDate: "", notes: "", items: [{ productId: "", quantity: "1", unitPrice: "" }] };

export default function SalesOrders() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: orders = [], isLoading } = useListSalesOrders();
  const { data: customers = [] } = useListCustomers();
  const { data: products = [] } = useListProducts();
  const createM = useCreateSalesOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sales-orders"] }); toast({ title: "Pedido criado!" }); setDialogOpen(false); } } });
  const approveM = useApproveSalesOrder({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sales-orders"] }); toast({ title: "Pedido aprovado!" }); } } });

  const form = useForm<OrderForm>({ defaultValues: dfv });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const onSubmit = (data: OrderForm) => {
    const items = data.items.map(i => ({
      ...i,
      totalPrice: String(parseFloat(i.quantity) * parseFloat(i.unitPrice)),
    }));
    createM.mutate({ data: { ...data, items } as any });
  };

  const columns = [
    { key: "orderNumber", header: "Pedido", className: "font-mono text-xs w-[100px]" },
    { key: "customerName", header: "Cliente", render: (r: any) => <span className="font-medium">{r.customerName}</span> },
    { key: "orderDate", header: "Data", render: (r: any) => format(new Date(r.orderDate), "dd/MM/yy", { locale: ptBR }) },
    { key: "expectedDeliveryDate", header: "Entrega", render: (r: any) => r.expectedDeliveryDate ? format(new Date(r.expectedDeliveryDate), "dd/MM/yy", { locale: ptBR }) : "–" },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "totalAmount", header: "Total", className: "text-right font-medium", render: (r: any) => `R$ ${parseFloat(r.totalAmount ?? "0").toFixed(2)}` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Pedidos de Venda" description="Gestão de pedidos de venda e disponibilidade." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Novo Pedido" />
      <DataTable data={orders as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum pedido encontrado."
        actions={row => (
          <div className="flex gap-1 justify-end">
            {(row as any).status === "rascunho" && (
              <Button size="icon" variant="ghost" className="text-emerald-600" title="Aprovar" onClick={() => approveM.mutate({ id: (row as any).id })}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido de Venda</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="customerId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Cliente *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>{safeArray(customers).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expectedDeliveryDate" render={({ field }) => (
                  <FormItem><FormLabel>Prazo de Entrega</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Itens do Pedido</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ productId: "", quantity: "1", unitPrice: "" })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <FormField control={form.control} name={`items.${i}.productId`} rules={{ required: true }} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Produto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="Produto..." /></SelectTrigger></FormControl>
                            <SelectContent>{safeArray(products).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <FormField control={form.control} name={`items.${i}.quantity`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Qtd</FormLabel><FormControl><Input type="number" step="0.01" className="text-xs" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="col-span-3">
                      <FormField control={form.control} name={`items.${i}.unitPrice`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Preço Unit.</FormLabel><FormControl><Input type="number" step="0.01" className="text-xs" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="col-span-1 pb-1">
                      <Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Criar Pedido</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
