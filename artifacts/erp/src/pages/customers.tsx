import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/ui/status-badge";

type CustomerForm = { name: string; document: string; email: string; phone: string; address: string; city: string; state: string; active: boolean; };
const defaultValues: CustomerForm = { name: "", document: "", email: "", phone: "", address: "", city: "", state: "", active: true };

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const { data: rows = [], isLoading } = useListCustomers({ search });
  const createM = useCreateCustomer({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); toast({ title: "Cliente criado!" }); setDialogOpen(false); } } });
  const updateM = useUpdateCustomer({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); toast({ title: "Atualizado!" }); setDialogOpen(false); } } });
  const deleteM = useDeleteCustomer({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/customers"] }); toast({ title: "Excluído!" }); setDeleteRow(null); } } });

  const form = useForm<CustomerForm>({ defaultValues });

  const openNew = () => { setEditRow(null); form.reset(defaultValues); setDialogOpen(true); };
  const openEdit = (r: any) => { setEditRow(r); form.reset({ name: r.name, document: r.document ?? "", email: r.email ?? "", phone: r.phone ?? "", address: r.address ?? "", city: r.city ?? "", state: r.state ?? "", active: r.active }); setDialogOpen(true); };
  const onSubmit = (data: CustomerForm) => editRow ? updateM.mutate({ id: editRow.id, data: data as any }) : createM.mutate({ data: data as any });

  const columns = [
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "document", header: "CNPJ/CPF", render: (r: any) => <span className="font-mono text-xs">{r.document ?? "–"}</span> },
    { key: "email", header: "E-mail", render: (r: any) => r.email ?? "–" },
    { key: "phone", header: "Telefone", render: (r: any) => r.phone ?? "–" },
    { key: "city", header: "Cidade/UF", render: (r: any) => r.city ? `${r.city}/${r.state}` : "–" },
    { key: "active", header: "Status", render: (r: any) => <StatusBadge status={r.active ? "disponivel" : "cancelado"} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Clientes" description="Cadastro de clientes." onNew={openNew} newLabel="Novo Cliente" />
      <DataTable data={rows as any[]} columns={columns} onSearch={setSearch} searchPlaceholder="Pesquisar por nome..." isLoading={isLoading}
        actions={row => <div className="flex gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteRow(row)}><Trash2 className="h-4 w-4" /></Button>
        </div>}
      />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editRow ? "Editar Cliente" : "Novo Cliente"}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" rules={{ required: "Obrigatório" }} render={({ field }) => (
                <FormItem><FormLabel>Nome *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="document" render={({ field }) => (
                  <FormItem><FormLabel>CNPJ/CPF</FormLabel><FormControl><Input placeholder="XX.XXX.XXX/0001-XX" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" {...field} /></FormControl></FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>UF</FormLabel><FormControl><Input maxLength={2} placeholder="SP" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="active" render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Ativo</FormLabel></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending || updateM.isPending}>{editRow ? "Salvar" : "Criar"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteRow} onOpenChange={o => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Excluir <strong>{deleteRow?.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteM.mutate({ id: deleteRow.id })} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
