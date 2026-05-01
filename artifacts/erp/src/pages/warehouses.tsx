import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListWarehouses, useCreateWarehouse, useUpdateWarehouse } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const WAREHOUSE_TYPES = [
  { value: "almoxarifado", label: "Almoxarifado" },
  { value: "usinagem", label: "Usinagem" },
  { value: "montagem", label: "Montagem" },
  { value: "expedicao", label: "Expedição" },
  { value: "qualidade", label: "Qualidade" },
  { value: "sucata", label: "Sucata" },
];

type WarehouseForm = { name: string; type: string; active: boolean; };
const defaultValues: WarehouseForm = { name: "", type: "almoxarifado", active: true };

export default function Warehouses() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);

  const { data: rows = [], isLoading } = useListWarehouses();
  const createM = useCreateWarehouse({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/warehouses"] }); toast({ title: "Almoxarifado criado!" }); setDialogOpen(false); } } });
  const updateM = useUpdateWarehouse({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/warehouses"] }); toast({ title: "Atualizado!" }); setDialogOpen(false); } } });

  const form = useForm<WarehouseForm>({ defaultValues });
  const openNew = () => { setEditRow(null); form.reset(defaultValues); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditRow(r); form.reset({ name: r.name, type: r.type, active: r.active }); setDialogOpen(true); };
  const onSubmit = (data: WarehouseForm) => editRow ? updateM.mutate({ id: editRow.id, data: data as any }) : createM.mutate({ data: data as any });

  const columns = [
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "type", header: "Tipo", render: (r: any) => <Badge variant="outline">{WAREHOUSE_TYPES.find(t => t.value === r.type)?.label ?? r.type}</Badge> },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Almoxarifados" description="Locais de armazenamento e setores físicos." onNew={openNew} newLabel="Novo Almoxarifado" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum almoxarifado cadastrado."
        actions={row => <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
        </div>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Editar" : "Novo"} Almoxarifado</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{WAREHOUSE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Ativo</FormLabel></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editRow ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
