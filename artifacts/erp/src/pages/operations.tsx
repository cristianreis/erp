import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListOperations, useCreateOperation, useUpdateOperation } from "@workspace/api-client-react";
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

const OP_TYPES = [
  { value: "corte", label: "Corte" }, { value: "torno", label: "Torneamento" }, { value: "fresa", label: "Fresamento" },
  { value: "furacao", label: "Furação" }, { value: "solda", label: "Soldagem" }, { value: "tratamento", label: "Tratamento" },
  { value: "inspecao", label: "Inspeção" }, { value: "montagem", label: "Montagem" }, { value: "embalagem", label: "Embalagem" }, { value: "outro", label: "Outro" },
];

type Form_ = { code: string; name: string; description: string; operationType: string; active: boolean; };
const dfv: Form_ = { code: "", name: "", description: "", operationType: "outro", active: true };

export default function Operations() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { data: rows = [], isLoading } = useListOperations();
  const createM = useCreateOperation({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/operations"] }); toast({ title: "Operação criada!" }); setDialogOpen(false); } } });
  const updateM = useUpdateOperation({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/operations"] }); toast({ title: "Atualizado!" }); setDialogOpen(false); } } });
  const form = useForm<Form_>({ defaultValues: dfv });
  const openNew = () => { setEditRow(null); form.reset(dfv); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditRow(r); form.reset({ code: r.code, name: r.name, description: r.description ?? "", operationType: r.operationType, active: r.active }); setDialogOpen(true); };
  const onSubmit = (data: Form_) => editRow ? updateM.mutate({ id: editRow.id, data: data as any }) : createM.mutate({ data: data as any });

  const columns = [
    { key: "code", header: "Código", className: "font-mono text-xs w-[120px]" },
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "operationType", header: "Tipo", render: (r: any) => <Badge variant="outline">{OP_TYPES.find(t => t.value === r.operationType)?.label ?? r.operationType}</Badge> },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Operações" description="Operações de processo utilizadas nos roteiros de fabricação." onNew={openNew} newLabel="Nova Operação" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma operação cadastrada."
        actions={row => <div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button></div>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Editar" : "Nova"} Operação</DialogTitle></DialogHeader>
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
              <FormField control={form.control} name="operationType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Operação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{OP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
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
