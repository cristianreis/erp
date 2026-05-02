import React, { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useListReceipts, useListPurchaseOrders, useListWarehouses } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { Package, CheckCircle, AlertTriangle, ArrowRight, Warehouse } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMutation } from "@tanstack/react-query";

type ItemReceiptRow = {
  poItemId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityRemaining: number;
  quantityToReceive: string;
  warehouseId: string;
  unitPrice: string;
};

type ReceiptForm = {
  purchaseOrderId: string;
  notes: string;
};

const STATUS_PO: Record<string, { label: string; className: string }> = {
  rascunho: { label: "Rascunho", className: "bg-gray-100 text-gray-700" },
  enviado: { label: "Enviado", className: "bg-blue-100 text-blue-700" },
  confirmado: { label: "Confirmado", className: "bg-violet-100 text-violet-700" },
  recebido_parcial: { label: "Parcialmente Recebido", className: "bg-yellow-100 text-yellow-700" },
  recebido: { label: "Recebido", className: "bg-emerald-100 text-emerald-700" },
  cancelado: { label: "Cancelado", className: "bg-red-100 text-red-700" },
};

export default function Receipts() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string>("");
  const [itemRows, setItemRows] = useState<ItemReceiptRow[]>([]);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string>("");

  const { data: receipts = [], isLoading } = useListReceipts();
  const { data: pos = [] } = useListPurchaseOrders();
  const { data: warehouses = [] } = useListWarehouses();

  // Fetch PO details when selected
  const { data: poDetail, isLoading: loadingPo } = useQuery<any>({
    queryKey: ["/api/purchase-orders", selectedPoId],
    queryFn: async () => {
      if (!selectedPoId) return null;
      const res = await fetch(`/api/purchase-orders/${selectedPoId}`);
      return res.json();
    },
    enabled: !!selectedPoId,
  });

  // When PO detail loads, populate item rows
  useEffect(() => {
    if (!poDetail?.items) { setItemRows([]); return; }
    const rows: ItemReceiptRow[] = poDetail.items.map((item: any) => {
      const ordered = parseFloat(item.quantity ?? "0");
      const received = parseFloat(item.receivedQuantity ?? "0");
      const remaining = Math.max(0, ordered - received);
      return {
        poItemId: item.id,
        productId: item.productId,
        productCode: item.productCode ?? "",
        productName: item.productName ?? "",
        quantityOrdered: ordered,
        quantityReceived: received,
        quantityRemaining: remaining,
        quantityToReceive: String(remaining),
        warehouseId: defaultWarehouseId,
        unitPrice: item.unitPrice ?? "0",
      };
    });
    setItemRows(rows);
  }, [poDetail, defaultWarehouseId]);

  const form = useForm<ReceiptForm>({ defaultValues: { purchaseOrderId: "", notes: "" } });

  const createReceiptM = useMutation({
    mutationFn: async (data: { purchaseOrderId: string; notes: string; items: any[] }) => {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erro ao registrar recebimento");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/receipts"] });
      qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      qc.invalidateQueries({ queryKey: ["/api/stock/balances"] });
      qc.invalidateQueries({ queryKey: ["/api/stock/movements"] });
      toast({ title: "Recebimento registrado!", description: "Estoque atualizado automaticamente." });
      setDialogOpen(false);
      setSelectedPoId("");
      setItemRows([]);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao registrar", description: err.message, variant: "destructive" });
    },
  });

  const handleOpen = () => {
    setSelectedPoId("");
    setItemRows([]);
    form.reset({ purchaseOrderId: "", notes: "" });
    setDialogOpen(true);
  };

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    form.setValue("purchaseOrderId", poId);
  };

  const updateItemRow = (idx: number, field: keyof ItemReceiptRow, value: string) => {
    setItemRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleApplyWarehouseAll = () => {
    if (!defaultWarehouseId) return;
    setItemRows(prev => prev.map(r => ({ ...r, warehouseId: defaultWarehouseId })));
  };

  const handleSubmit = form.handleSubmit((data) => {
    const validItems = itemRows.filter(r => parseFloat(r.quantityToReceive) > 0 && r.warehouseId);
    if (!data.purchaseOrderId) {
      toast({ title: "Selecione um pedido de compra", variant: "destructive" }); return;
    }
    if (validItems.length === 0) {
      toast({ title: "Nenhum item com quantidade e almoxarifado preenchidos", variant: "destructive" }); return;
    }
    const missingWh = itemRows.filter(r => parseFloat(r.quantityToReceive) > 0 && !r.warehouseId);
    if (missingWh.length > 0) {
      toast({ title: "Selecione o almoxarifado para todos os itens a receber", variant: "destructive" }); return;
    }
    createReceiptM.mutate({
      purchaseOrderId: data.purchaseOrderId,
      notes: data.notes,
      items: validItems.map(r => ({
        purchaseOrderItemId: r.poItemId,
        productId: r.productId,
        quantity: r.quantityToReceive,
        warehouseId: r.warehouseId,
        unitPrice: r.unitPrice,
      })),
    });
  });

  // Only show POs that can be received
  const receivablePOs = (pos as any[]).filter(p =>
    ["enviado", "confirmado", "recebido_parcial"].includes(p.status)
  );

  const receiptColumns = [
    { key: "receiptNumber", header: "Nº Recebimento", className: "font-mono text-xs w-[130px]" },
    { key: "receiptDate", header: "Data/Hora", render: (r: any) => format(new Date(r.receiptDate), "dd/MM/yy HH:mm", { locale: ptBR }) },
    { key: "status", header: "Status", render: (r: any) => {
      const s = r.status === "concluido" ? { label: "Concluído", c: "bg-emerald-100 text-emerald-800" }
        : r.status === "pendente" ? { label: "Pendente", c: "bg-yellow-100 text-yellow-800" }
        : { label: r.status, c: "bg-gray-100 text-gray-800" };
      return <Badge className={s.c}>{s.label}</Badge>;
    }},
    { key: "notes", header: "Observações", render: (r: any) => r.notes ?? "–" },
  ];

  const totalItems = itemRows.reduce((s, r) => s + parseFloat(r.quantityToReceive || "0"), 0);
  const allHaveWh = itemRows.every(r => parseFloat(r.quantityToReceive || "0") <= 0 || !!r.warehouseId);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Recebimentos de Compra"
        description="Registre o recebimento de materiais — o estoque é atualizado automaticamente."
        onNew={handleOpen}
        newLabel="Registrar Recebimento"
      />
      <DataTable data={receipts as any[]} columns={receiptColumns} isLoading={isLoading} emptyMessage="Nenhum recebimento registrado." />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Registrar Recebimento de Compra
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <div className="space-y-5">
              {/* Step 1: Select PO */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">1</span>
                  <span className="font-semibold text-sm">Selecione o Pedido de Compra</span>
                </div>
                {receivablePOs.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Não há pedidos de compra disponíveis para recebimento. Crie e envie um pedido de compra primeiro.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select value={selectedPoId} onValueChange={handlePoSelect}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o pedido de compra..." />
                    </SelectTrigger>
                    <SelectContent>
                      {receivablePOs.map((po: any) => (
                        <SelectItem key={po.id} value={po.id}>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold">{po.orderNumber}</span>
                            <span className="text-muted-foreground">–</span>
                            <span>{po.supplierName}</span>
                            <Badge className={`text-xs ${STATUS_PO[po.status]?.className}`}>
                              {STATUS_PO[po.status]?.label ?? po.status}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Step 2: Default warehouse */}
              {selectedPoId && itemRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">2</span>
                    <span className="font-semibold text-sm">Almoxarifado de Destino</span>
                  </div>
                  <div className="flex gap-2">
                    <Select value={defaultWarehouseId} onValueChange={setDefaultWarehouseId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione o almoxarifado padrão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(warehouses as any[]).map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>
                            <div className="flex items-center gap-2">
                              <Warehouse className="h-3 w-3" />
                              {w.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" onClick={handleApplyWarehouseAll} disabled={!defaultWarehouseId}>
                      Aplicar a todos
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Items table */}
              {loadingPo && selectedPoId && (
                <div className="text-center py-6 text-muted-foreground text-sm">Carregando itens do pedido...</div>
              )}

              {selectedPoId && itemRows.length > 0 && !loadingPo && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">3</span>
                    <span className="font-semibold text-sm">Itens do Pedido — Informe as Quantidades Recebidas</span>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2 font-medium text-xs text-muted-foreground">Código</th>
                          <th className="text-left p-2 font-medium text-xs text-muted-foreground">Produto</th>
                          <th className="text-right p-2 font-medium text-xs text-muted-foreground">Qtd Pedida</th>
                          <th className="text-right p-2 font-medium text-xs text-muted-foreground">Já Recebido</th>
                          <th className="text-right p-2 font-medium text-xs text-muted-foreground">Saldo</th>
                          <th className="text-center p-2 font-medium text-xs text-muted-foreground w-28">Qtd a Receber</th>
                          <th className="text-left p-2 font-medium text-xs text-muted-foreground w-44">Almoxarifado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemRows.map((row, idx) => {
                          const isFullyReceived = row.quantityRemaining <= 0;
                          return (
                            <tr key={row.poItemId} className={`border-t ${isFullyReceived ? "opacity-50 bg-muted/20" : ""}`}>
                              <td className="p-2 font-mono text-xs">{row.productCode}</td>
                              <td className="p-2 text-sm font-medium">{row.productName}</td>
                              <td className="p-2 text-right text-sm">{row.quantityOrdered.toFixed(2)}</td>
                              <td className="p-2 text-right text-sm text-blue-600">{row.quantityReceived.toFixed(2)}</td>
                              <td className="p-2 text-right text-sm">
                                {isFullyReceived
                                  ? <span className="text-emerald-600 flex items-center justify-end gap-1"><CheckCircle className="h-3 w-3" />Completo</span>
                                  : <span className="font-semibold text-orange-600">{row.quantityRemaining.toFixed(2)}</span>
                                }
                              </td>
                              <td className="p-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={row.quantityRemaining}
                                  step="0.001"
                                  className="text-xs text-right h-8"
                                  value={row.quantityToReceive}
                                  disabled={isFullyReceived}
                                  onChange={e => updateItemRow(idx, "quantityToReceive", e.target.value)}
                                />
                              </td>
                              <td className="p-2">
                                <Select
                                  value={row.warehouseId}
                                  onValueChange={v => updateItemRow(idx, "warehouseId", v)}
                                  disabled={isFullyReceived}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Almox..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(warehouses as any[]).map((w: any) => (
                                      <SelectItem key={w.id} value={w.id} className="text-xs">{w.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {!allHaveWh && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">Selecione o almoxarifado para todos os itens com quantidade preenchida.</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 4: Notes */}
              {selectedPoId && itemRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-white text-xs font-bold">4</span>
                    <span className="font-semibold text-sm">Observações</span>
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea placeholder="Observações do recebimento, condição dos materiais, NF, etc..." rows={2} {...field} />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>
              )}

              {/* Summary */}
              {totalItems > 0 && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total de itens a dar entrada:</span>
                      <span className="font-bold text-primary text-lg">{totalItems.toFixed(3)} unidades</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      O estoque será atualizado automaticamente e o status do pedido de compra será alterado.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createReceiptM.isPending || !selectedPoId || totalItems <= 0 || !allHaveWh}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {createReceiptM.isPending ? "Registrando..." : "Confirmar Recebimento"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
