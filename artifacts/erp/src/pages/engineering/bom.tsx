import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListBomHeaders, useCreateBomHeader, useListProducts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ItemForm = { componentProductId: string; quantityPerParent: string; scrapPercentage: string; isMandatory: boolean; notes: string; };
type BomForm = { parentProductId: string; description: string; active: boolean; items: ItemForm[]; };
const dfv: BomForm = { parentProductId: "", description: "", active: true, items: [{ componentProductId: "", quantityPerParent: "1", scrapPercentage: "0", isMandatory: true, notes: "" }] };

export default function BomPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: boms = [], isLoading } = useListBomHeaders();
  const { data: products = [] } = useListProducts();
  const createM = useCreateBomHeader({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/bom"] }); toast({ title: "Ficha técnica criada!" }); setDialogOpen(false); } } });

  const form = useForm<BomForm>({ defaultValues: dfv });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const onSubmit = (data: BomForm) => createM.mutate({ data: data as any });

  const columns = [
    { key: "productCode", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "productName", header: "Produto Pai", render: (r: any) => <span className="font-medium">{r.productName}</span> },
    { key: "version", header: "Rev.", className: "text-center w-[50px]" },
    { key: "description", header: "Descrição", render: (r: any) => r.description ?? "–" },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativa" : "Inativa"}</Badge> },
    { key: "createdAt", header: "Criado em", render: (r: any) => format(new Date(r.createdAt), "dd/MM/yy", { locale: ptBR }) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Ficha Técnica (BOM)" description="Estrutura de produto — Bill of Materials." onNew={() => { form.reset(dfv); setDialogOpen(true); }} newLabel="Nova Ficha Técnica" />
      <DataTable data={boms as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma ficha técnica cadastrada." />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nova Ficha Técnica</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="parentProductId" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><label className="text-sm font-medium">Produto Pai *</label>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger></FormControl>
                    <SelectContent>{(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><label className="text-sm font-medium">Descrição</label><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><label className="text-sm font-normal">Ativa</label></FormItem>
              )} />
              <div className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Componentes</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => append({ componentProductId: "", quantityPerParent: "1", scrapPercentage: "0", isMandatory: true, notes: "" })}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                </div>
                {fields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end border-b pb-2">
                    <div className="col-span-5">
                      <FormField control={form.control} name={`items.${i}.componentProductId`} rules={{ required: true }} render={({ field }) => (
                        <FormItem><label className="text-xs font-medium">Componente</label>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="text-xs"><SelectValue placeholder="..." /></SelectTrigger></FormControl>
                            <SelectContent>{(products as any[]).map(p => <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <FormField control={form.control} name={`items.${i}.quantityPerParent`} render={({ field }) => (
                        <FormItem><label className="text-xs font-medium">Qtd/pai</label><FormControl><Input type="number" step="0.0001" className="text-xs" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="col-span-2">
                      <FormField control={form.control} name={`items.${i}.scrapPercentage`} render={({ field }) => (
                        <FormItem><label className="text-xs font-medium">Perda %</label><FormControl><Input type="number" step="0.01" className="text-xs" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    <div className="col-span-2 pb-1 flex items-center gap-1">
                      <FormField control={form.control} name={`items.${i}.isMandatory`} render={({ field }) => (
                        <FormItem className="flex items-center gap-1 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75" /></FormControl><label className="text-xs font-normal">Obrig.</label></FormItem>
                      )} />
                    </div>
                    <div className="col-span-1 pb-1">
                      <Button type="button" size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => remove(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Criar Ficha</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
