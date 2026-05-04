import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListRoutings, useCreateRouting, useListProducts, useListOperations, useListMachines, useListSectors } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type OpForm = { sequenceNumber: string; operationId: string; machineId: string; sectorId: string; setupTimeMinutes: string; standardTimeMinutes: string; };
type RoutingForm = { productId: string; description: string; active: boolean; operations: OpForm[]; };
const dfv: RoutingForm = { productId: "", description: "", active: true, operations: [{ sequenceNumber: "10", operationId: "", machineId: "", sectorId: "", setupTimeMinutes: "0", standardTimeMinutes: "0" }] };

export default function Routings() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: rows = [], isLoading } = useListRoutings();
  const { data: products = [] } = useListProducts();
  const { data: operations = [] } = useListOperations();
  const { data: machines = [] } = useListMachines();
  const { data: sectors = [] } = useListSectors();
  const createM = useCreateRouting({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/routings"] }); toast({ title: "Roteiro criado!" }); setDialogOpen(false); } } });
  const form = useForm<RoutingForm>({ defaultValues: dfv });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "operations" });
  const onSubmit = (data: RoutingForm) => {
    const ops = data.operations.map(o => ({ ...o, sequenceNumber: parseInt(o.sequenceNumber), machineId: o.machineId === "none" ? null : o.machineId || null, sectorId: o.sectorId === "none" ? null : o.sectorId || null, setupTimeMinutes: parseFloat(o.setupTimeMinutes), standardTimeMinutes: parseFloat(o.standardTimeMinutes) }));
    createM.mutate({ data: { ...data, operations: ops } as any });
  };

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "version", header: "Rev.", className: "text-center w-[50px]" },
    { key: "description", header: "Descrição", render: (r: any) => r.description ?? "–" },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Roteiros de Fabricação" description="Sequência de operações para fabricação dos produtos." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Novo Roteiro" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum roteiro cadastrado." />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Roteiro de Fabricação</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem><FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>{safeArray(products).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <div className="flex items-center gap-4">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="flex-1"><FormLabel>Descrição</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="active" render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0 mt-5"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Ativo</FormLabel></FormItem>
                )} />
              </div>
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Operações</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ sequenceNumber: String((fields.length + 1) * 10), operationId: "", machineId: "", sectorId: "", setupTimeMinutes: "0", standardTimeMinutes: "0" })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                    <div className="col-span-1"><FormField control={form.control} name={`operations.${i}.sequenceNumber`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Seq.</FormLabel><FormControl><Input className="text-xs" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="col-span-3"><FormField control={form.control} name={`operations.${i}.operationId`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Operação</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                          <SelectContent>{safeArray(operations).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} /></div>
                    <div className="col-span-3"><FormField control={form.control} name={`operations.${i}.machineId`} render={({ field }) => (
                      <FormItem><FormLabel className="text-xs">Máquina</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "none"}>
                          <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{safeArray(machines).map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </FormItem>
                    )} /></div>
                    <div className="col-span-2"><FormField control={form.control} name={`operations.${i}.setupTimeMinutes`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Setup(min)</FormLabel><FormControl><Input type="number" className="text-xs" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="col-span-2"><FormField control={form.control} name={`operations.${i}.standardTimeMinutes`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Padrão(min)</FormLabel><FormControl><Input type="number" className="text-xs" {...field} /></FormControl></FormItem>)} /></div>
                    <div className="col-span-1 pb-1"><Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(i)}><X className="h-3 w-3" /></Button></div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Criar Roteiro</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
