import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListMachines, useCreateMachine, useUpdateMachine, useListSectors } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Form_ = { code: string; name: string; type: string; sectorId: string; capacityPerDay: string; notes: string; active: boolean; };
const dfv: Form_ = { code: "", name: "", type: "", sectorId: "none", capacityPerDay: "", notes: "", active: true };

export default function Machines() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { data: rows = [], isLoading } = useListMachines();
  const { data: sectors = [] } = useListSectors();
  const createM = useCreateMachine({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/machines"] }); toast({ title: "Máquina criada!" }); setDialogOpen(false); } } });
  const updateM = useUpdateMachine({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/machines"] }); toast({ title: "Atualizado!" }); setDialogOpen(false); } } });
  const form = useForm<Form_>({ defaultValues: dfv });
  const openNew = () => { setEditRow(null); form.reset(dfv); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditRow(r); form.reset({ code: r.code, name: r.name, type: r.type ?? "", sectorId: r.sectorId ?? "none", capacityPerDay: String(r.capacityPerDay ?? ""), notes: r.notes ?? "", active: r.active }); setDialogOpen(true); };
  const onSubmit = (data: Form_) => {
    const payload = { ...data, sectorId: data.sectorId === "none" ? null : data.sectorId, capacityPerDay: data.capacityPerDay || null };
    editRow ? updateM.mutate({ id: editRow.id, data: payload as any }) : createM.mutate({ data: payload as any });
  };

  const columns = [
    { key: "code", header: "Código", className: "font-mono text-xs w-[100px]" },
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "type", header: "Tipo", render: (r: any) => r.type ?? "–" },
    { key: "sectorId", header: "Setor", render: (r: any) => safeArray(sectors).find(s => s.id === r.sectorId)?.name ?? "–" },
    { key: "capacityPerDay", header: "Cap./Dia (min)", className: "text-right", render: (r: any) => r.capacityPerDay ?? "–" },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Máquinas e Equipamentos" description="Cadastro de máquinas e equipamentos produtivos." onNew={openNew} newLabel="Nova Máquina" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma máquina cadastrada."
        actions={row => <div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button></div>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Editar" : "Nova"} Máquina</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Código *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="name" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem><FormLabel>Tipo</FormLabel><FormControl><Input placeholder="Ex: torno_cnc" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="sectorId" render={({ field }) => (
                  <FormItem><FormLabel>Setor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {safeArray(sectors).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="capacityPerDay" render={({ field }) => (
                <FormItem><FormLabel>Capacidade por Dia (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Ativo</FormLabel></FormItem>
              )} />
              <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">{editRow ? "Salvar" : "Criar"}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
