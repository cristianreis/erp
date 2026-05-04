import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListProductionOrders, useListProductionAppointments, useCreateProductionAppointment } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type AptForm = { startTime: string; endTime: string; quantityGood: string; quantityRejected: string; notes: string; };
const dfv: AptForm = { startTime: "", endTime: "", quantityGood: "0", quantityRejected: "0", notes: "" };

function AppointmentsList({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: apts = [], isLoading } = useListProductionAppointments(orderId);
  const createM = useCreateProductionAppointment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/production-orders"] });
        toast({ title: "Apontamento registrado!" });
        setDialogOpen(false);
      }
    }
  });
  const form = useForm<AptForm>({ defaultValues: dfv });
  const onSubmit = (data: AptForm) => {
    createM.mutate({ id: orderId, data: { ...data, endTime: data.endTime || null } as any });
  };

  const columns = [
    { key: "startTime", header: "Início", render: (r: any) => format(new Date(r.startTime), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "endTime", header: "Fim", render: (r: any) => r.endTime ? format(new Date(r.endTime), "dd/MM/yy HH:mm", { locale: ptBR }) : "–" },
    { key: "operationName", header: "Operação", render: (r: any) => r.operationName ?? "–" },
    { key: "quantityGood", header: "Qtd Boa", className: "text-right text-emerald-700 font-medium", render: (r: any) => parseFloat(r.quantityGood).toFixed(2) },
    { key: "quantityRejected", header: "Qtd Rejeitada", className: "text-right text-red-600 font-medium", render: (r: any) => parseFloat(r.quantityRejected).toFixed(2) },
    { key: "notes", header: "Obs.", render: (r: any) => r.notes ?? "–" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { form.reset(dfv); setDialogOpen(true); }}>+ Novo Apontamento</Button>
      </div>
      <DataTable data={apts as any[]} columns={columns} isLoading={isLoading} emptyMessage="Nenhum apontamento registrado para esta OP." />
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Apontamento de Produção</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Início *</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>Fim</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantityGood" rules={{ required: "Obrigatório" }} render={({ field }) => (
                  <FormItem><FormLabel>Qtd Boa *</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quantityRejected" render={({ field }) => (
                  <FormItem><FormLabel>Qtd Rejeitada</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductionAppointments() {
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const { data: orders = [], isLoading } = useListProductionOrders();
  const activeOrders = safeArray(orders).filter(o => ["em_producao", "liberada"].includes(o.status));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Apontamentos de Produção" description="Registre o progresso e horas trabalhadas por ordem de produção." />
      <div className="max-w-sm">
        <label className="text-sm font-medium mb-1 block">Selecione a Ordem de Produção</label>
        <Select onValueChange={setSelectedOrder} value={selectedOrder}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma OP em andamento..." />
          </SelectTrigger>
          <SelectContent>
            {activeOrders.map(o => (
              <SelectItem key={o.id} value={o.id}>{o.orderNumber} – {o.productName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedOrder && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardList className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione uma OP para ver ou registrar apontamentos.</p>
        </div>
      )}

      {selectedOrder && (
        <Card>
          <CardContent className="pt-4">
            <AppointmentsList orderId={selectedOrder} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
