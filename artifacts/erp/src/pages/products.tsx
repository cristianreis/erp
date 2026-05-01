import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ITEM_TYPES = [
  { value: "produto_acabado", label: "Produto Acabado" },
  { value: "semiacabado", label: "Semiacabado" },
  { value: "fundido_bruto", label: "Fundido Bruto" },
  { value: "materia_prima", label: "Matéria Prima" },
  { value: "componente_comprado", label: "Componente Comprado" },
  { value: "produto_em_processo", label: "Em Processo" },
  { value: "servico", label: "Serviço" },
];

const UNITS = [
  { value: "peca", label: "Peça" },
  { value: "kg", label: "Kg" },
  { value: "metro", label: "Metro" },
  { value: "conjunto", label: "Conjunto" },
  { value: "litro", label: "Litro" },
  { value: "unidade", label: "Unidade" },
];

type ProductForm = {
  code: string;
  name: string;
  description: string;
  itemType: string;
  unit: string;
  minimumStock: string;
  salePrice: string;
  costPrice: string;
  leadTimeDays: string;
  isSellable: boolean;
  isManufactured: boolean;
  isPurchased: boolean;
  requiresMachining: boolean;
  requiresAssembly: boolean;
  active: boolean;
};

const defaultValues: ProductForm = {
  code: "", name: "", description: "", itemType: "materia_prima", unit: "peca",
  minimumStock: "0", salePrice: "", costPrice: "", leadTimeDays: "",
  isSellable: false, isManufactured: false, isPurchased: false,
  requiresMachining: false, requiresAssembly: false, active: true,
};

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<any>(null);
  const [deleteRow, setDeleteRow] = useState<any>(null);

  const { data: products = [], isLoading } = useListProducts({ search });
  const createMut = useCreateProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: "Produto criado!" }); setDialogOpen(false); } } });
  const updateMut = useUpdateProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: "Produto atualizado!" }); setDialogOpen(false); } } });
  const deleteMut = useDeleteProduct({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/products"] }); toast({ title: "Produto excluído!" }); setDeleteRow(null); } } });

  const form = useForm<ProductForm>({ defaultValues });

  const openNew = () => { setEditRow(null); form.reset(defaultValues); setDialogOpen(true); };
  const openEdit = (row: any) => {
    setEditRow(row);
    form.reset({
      code: row.code, name: row.name, description: row.description ?? "",
      itemType: row.itemType, unit: row.unit,
      minimumStock: String(row.minimumStock ?? "0"),
      salePrice: String(row.salePrice ?? ""),
      costPrice: String(row.costPrice ?? ""),
      leadTimeDays: String(row.leadTimeDays ?? ""),
      isSellable: row.isSellable, isManufactured: row.isManufactured,
      isPurchased: row.isPurchased, requiresMachining: row.requiresMachining,
      requiresAssembly: row.requiresAssembly, active: row.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    const payload = {
      ...data,
      minimumStock: data.minimumStock || "0",
      salePrice: data.salePrice || null,
      costPrice: data.costPrice || null,
      leadTimeDays: data.leadTimeDays ? parseInt(data.leadTimeDays) : null,
    };
    if (editRow) {
      updateMut.mutate({ id: editRow.id, data: payload as any });
    } else {
      createMut.mutate({ data: payload as any });
    }
  };

  const columns = [
    { key: "code", header: "Código", className: "font-mono text-xs w-[110px]" },
    { key: "name", header: "Nome", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "itemType", header: "Tipo", render: (r: any) => <Badge variant="outline" className="text-xs">{ITEM_TYPES.find(t => t.value === r.itemType)?.label ?? r.itemType}</Badge> },
    { key: "unit", header: "Un", className: "text-center w-[60px]", render: (r: any) => UNITS.find(u => u.value === r.unit)?.label ?? r.unit },
    { key: "minimumStock", header: "Est. Mín", className: "text-right w-[80px]", render: (r: any) => parseFloat(r.minimumStock ?? "0").toFixed(0) },
    { key: "salePrice", header: "Pr. Venda", className: "text-right w-[100px]", render: (r: any) => r.salePrice ? `R$ ${parseFloat(r.salePrice).toFixed(2)}` : "-" },
    {
      key: "flags", header: "Flags", render: (r: any) => (
        <div className="flex gap-1 flex-wrap">
          {r.isSellable && <Badge variant="secondary" className="text-xs py-0">Venda</Badge>}
          {r.isManufactured && <Badge variant="secondary" className="text-xs py-0">Fab.</Badge>}
          {r.isPurchased && <Badge variant="secondary" className="text-xs py-0">Compra</Badge>}
        </div>
      )
    },
    { key: "active", header: "Status", render: (r: any) => <StatusBadge status={r.active ? "disponivel" : "cancelado"} /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Produtos" description="Cadastro de produtos, matérias-primas e componentes." onNew={openNew} newLabel="Novo Produto" />

      <DataTable
        data={products as any[]}
        columns={columns}
        onSearch={setSearch}
        searchPlaceholder="Pesquisar por nome..."
        isLoading={isLoading}
        emptyMessage="Nenhum produto encontrado."
        actions={row => (
          <div className="flex gap-1 justify-end">
            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteRow(row)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editRow ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl><Input placeholder="Ex: PA-ACL60" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="name" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Nome do produto" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="itemType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Item</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="minimumStock" render={({ field }) => (
                  <FormItem><FormLabel>Estoque Mínimo</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem><FormLabel>Custo (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="salePrice" render={({ field }) => (
                  <FormItem><FormLabel>Venda (R$)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="leadTimeDays" render={({ field }) => (
                  <FormItem><FormLabel>Lead Time (dias)</FormLabel><FormControl><Input type="number" placeholder="Ex: 7" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { name: "isSellable", label: "É vendável" },
                  { name: "isManufactured", label: "É fabricado" },
                  { name: "isPurchased", label: "É comprado" },
                  { name: "requiresMachining", label: "Requer usinagem" },
                  { name: "requiresAssembly", label: "Requer montagem" },
                  { name: "active", label: "Ativo" },
                ].map(f => (
                  <FormField key={f.name} control={form.control} name={f.name as any} render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">{f.label}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                  {editRow ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteRow?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate({ id: deleteRow.id })} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
