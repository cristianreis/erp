import React, { useState } from "react";
import { useListStockBalances, useListWarehouses, useListProducts, useCreateStockMovement } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { ArrowRightLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const MOVEMENT_TYPES = [
  { value: "entrada_compra", label: "Entrada de Compra" },
  { value: "entrada_producao", label: "Entrada de Produção" },
  { value: "ajuste_entrada", label: "Ajuste de Entrada" },
  { value: "ajuste_saida", label: "Ajuste de Saída" },
  { value: "saida_producao", label: "Saída para Produção" },
  { value: "transferencia", label: "Transferência" },
  { value: "perda_sucata", label: "Perda/Sucata" },
];

type MovForm = { productId: string; warehouseId: string; movementType: string; quantity: string; stockStatus: string; notes: string; };
const dfv: MovForm = { productId: "", warehouseId: "", movementType: "ajuste_entrada", quantity: "", stockStatus: "disponivel", notes: "" };

export default function StockBalances() {
  const qc = useQueryClient();
  const [movDialogOpen, setMovDialogOpen] = useState(false);
  const { data: balances = [], isLoading } = useListStockBalances();
  const { data: products = [] } = useListProducts();
  const { data: warehouses = [] } = useListWarehouses();
  const movM = useCreateStockMovement({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/stock/balances"] }); toast({ title: "Movimentação registrada!" }); setMovDialogOpen(false); } } });
  const form = useForm<MovForm>({ defaultValues: dfv });

  const onSubmit = (data: MovForm) => movM.mutate({ data: data as any });

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "warehouseName", header: "Almoxarifado" },
    { key: "stockStatus", header: "Status", render: (r: any) => <StatusBadge status={r.stockStatus} /> },
    { key: "batchNumber", header: "Lote", render: (r: any) => r.batchNumber ?? "–" },
    { key: "quantity", header: "Saldo Total", className: "text-right font-medium", render: (r: any) => `${parseFloat(r.quantity ?? "0").toFixed(2)} ${r.productUnit ?? ""}` },
    { key: "reservedQuantity", header: "Reservado", className: "text-right text-amber-600", render: (r: any) => parseFloat(r.reservedQuantity ?? "0").toFixed(2) },
    { key: "available", header: "Disponível", className: "text-right font-semibold text-emerald-700", render: (r: any) => (parseFloat(r.quantity ?? "0") - parseFloat(r.reservedQuantity ?? "0")).toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Saldos de Estoque" description="Posição atual de estoque por almoxarifado e status.">
        <Button onClick={() => { form.reset(dfv); setMovDialogOpen(true); }}>
          <ArrowRightLeft className="h-4 w-4 mr-2" /> Registrar Movimentação
        </Button>
      </PageHeader>
      <DataTable data={balances as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum saldo de estoque encontrado." />

      <Dialog open={movDialogOpen} onOpenChange={setMovDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Movimentação de Estoque</DialogTitle></DialogHeader>
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
              <FormField control={form.control} name="warehouseId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Almoxarifado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>{(warehouses as any[]).map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="movementType" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{MOVEMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Quantidade *</FormLabel><FormControl><Input type="number" step="0.0001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setMovDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={movM.isPending}>Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
