import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListPurchaseOrders, useCreatePurchaseOrder, useListSuppliers, useListProducts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X, Send, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

type ItemForm = { productId: string; quantity: string; unitPrice: string; };
type PoForm = { supplierId: string; expectedDate: string; notes: string; items: ItemForm[]; };
const dfv: PoForm = { supplierId: "", expectedDate: "", notes: "", items: [{ productId: "", quantity: "1", unitPrice: "" }] };

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
  enviado: { label: "Enviado ao Fornecedor", className: "bg-blue-100 text-blue-700" },
  confirmado: { label: "Confirmado", className: "bg-violet-100 text-violet-700" },
  recebido_parcial: { label: "Recebido Parcialmente", className: "bg-yellow-100 text-yellow-700" },
  recebido: { label: "Recebido", className: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

export default function PurchaseOrders() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: orders = [], isLoading } = useListPurchaseOrders();
  const { data: suppliers = [] } = useListSuppliers();
  const { data: products = [] } = useListProducts();

  const createM = useCreatePurchaseOrder({ mutation: { onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    toast({ title: "Pedido de compra criado!" });
    setDialogOpen(false);
  }}});

  const updateStatusM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/purchase-orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] }),
  });

  const form = useForm<PoForm>({ defaultValues: dfv });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const onSubmit = (data: PoForm) => {
    const items = data.items.map(i => ({
      ...i,
      totalPrice: String(parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0")),
    }));
    createM.mutate({ data: { ...data, items } as any });
  };

  const columns = [
    { key: "orderNumber", header: "Pedido", className: "font-mono text-xs font-bold w-[120px]" },
    { key: "supplierName", header: "Fornecedor", render: (r: any) => <span className="font-medium">{r.supplierName}</span> },
    { key: "orderDate", header: "Data", render: (r: any) => format(new Date(r.orderDate), "dd/MM/yy", { locale: ptBR }) },
    { key: "expectedDate", header: "Previsão Entrega", render: (r: any) => r.expectedDate ? format(new Date(r.expectedDate), "dd/MM/yy", { locale: ptBR }) : "–" },
    { key: "status", header: "Status", render: (r: any) => {
      const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-700" };
      return <Badge className={cfg.className}>{cfg.label}</Badge>;
    }},
    { key: "totalAmount", header: "Total", className: "text-right", render: (r: any) =>
      `R$ ${parseFloat(r.totalAmount ?? "0").toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
    { key: "actions", header: "", render: (r: any) => (
      <div className="flex gap-1 justify-end">
        {r.status === "rascunho" && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => updateStatusM.mutate({ id: r.id, status: "enviado" })}>
            <Send className="h-3 w-3" /> Enviar
          </Button>
        )}
        {["enviado", "confirmado", "recebido_parcial"].includes(r.status) && (
          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate("/compras/recebimentos")}>
            <Plus className="h-3 w-3" /> Receber
          </Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Pedidos de Compra"
        description="Gestão de pedidos de compra a fornecedores. Use o botão 'Receber' para dar entrada no estoque."
        onNew={() => { form.reset(dfv); setDialogOpen(true); }}
        newLabel="Novo Pedido"
      />
      <DataTable data={orders as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum pedido de compra cadastrado." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Pedido de Compra</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="supplierId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o fornecedor..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {safeArray(suppliers).length === 0
                          ? <SelectItem value="_none" disabled>Nenhum fornecedor cadastrado</SelectItem>
                          : safeArray(suppliers).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="expectedDate" render={({ field }) => (
                  <FormItem><FormLabel>Previsão de Entrega</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                )} />
              </div>

              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Itens do Pedido</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ productId: "", quantity: "1", unitPrice: "" })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                  </Button>
                </div>
                {fields.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Nenhum item adicionado.</p>
                )}
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2 last:border-0 last:pb-0">
                    <div className="col-span-6">
                      <FormField control={form.control} name={`items.${i}.productId`} rules={{ required: true }} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Produto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="text-xs h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {safeArray(products).length === 0
                                ? <SelectItem value="_none" disabled>Nenhum produto cadastrado</SelectItem>
                                : safeArray(products).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)
                              }
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <FormField control={form.control} name={`items.${i}.quantity`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Quantidade</FormLabel>
                          <FormControl><Input type="number" step="0.01" min="0.01" className="text-xs h-8" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="col-span-3">
                      <FormField control={form.control} name={`items.${i}.unitPrice`} render={({ field }) => (
                        <FormItem><FormLabel className="text-xs">Preço Unitário (R$)</FormLabel>
                          <FormControl><Input type="number" step="0.01" min="0" className="text-xs h-8" {...field} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                    <div className="col-span-1 pb-1">
                      <Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(i)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} placeholder="Condições de pagamento, prazo, observações..." {...field} /></FormControl></FormItem>
              )} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>{createM.isPending ? "Criando..." : "Criar Pedido"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
