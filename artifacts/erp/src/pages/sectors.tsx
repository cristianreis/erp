import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListSectors, useCreateSector, useUpdateSector } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Form_ = { name: string; description: string; active: boolean; };
const dfv: Form_ = { name: "", description: "", active: true };

export default function Sectors() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const { data: rows = [], isLoading } = useListSectors();
  const createM = useCreateSector({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sectors"] }); toast({ title: "Setor criado!" }); setDialogOpen(false); } } });
  const updateM = useUpdateSector({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/sectors"] }); toast({ title: "Atualizado!" }); setDialogOpen(false); } } });
  const form = useForm<Form_>({ defaultValues: dfv });
  const openNew = () => { setEditRow(null); form.reset(dfv); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditRow(r); form.reset({ name: r.name, description: r.description ?? "", active: r.active }); setDialogOpen(true); };
  const onSubmit = (data: Form_) => editRow ? updateM.mutate({ id: editRow.id, data: data as any }) : createM.mutate({ data: data as any });

  const columns = [
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Descrição", render: (r: any) => r.description ?? "–" },
    { key: "active", header: "Status", render: (r: any) => <Badge className={r.active ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-800"}>{r.active ? "Ativo" : "Inativo"}</Badge> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Setores" description="Setores produtivos da fábrica." onNew={openNew} newLabel="Novo Setor" />
      <DataTable data={rows as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum setor cadastrado."
        actions={row => <div className="flex gap-1 justify-end"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button></div>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRow ? "Editar" : "Novo"} Setor</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
