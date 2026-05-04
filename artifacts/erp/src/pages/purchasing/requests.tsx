import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPurchaseRequests,
  useCreatePurchaseRequest,
  useApprovePurchaseRequest,
  useListProducts,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { CheckCircle2, Package, Calendar, Hash, User, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ReqForm = {
  productId: string;
  quantity: string;
  neededDate: string;
  source: string;
  description: string;
};

const dfv: ReqForm = {
  productId: "",
  quantity: "1",
  neededDate: "",
  source: "manual",
  description: "",
};

const SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "mrp", label: "MRP" },
  { value: "estoque_minimo", label: "Estoque Mínimo" },
  { value: "producao", label: "Produção" },
];

const STATUS_COLORS: Record<string, string> = {
  aberta: "bg-blue-50 border-blue-200 text-blue-800",
  aprovada: "bg-emerald-50 border-emerald-200 text-emerald-800",
  convertida: "bg-purple-50 border-purple-200 text-purple-800",
  cancelada: "bg-red-50 border-red-200 text-red-800",
};

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
        <span className="text-sm font-medium text-foreground break-words">{value ?? "–"}</span>
      </div>
    </div>
  );
}

export default function PurchaseRequests() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const { data: rows = [], isLoading } = useListPurchaseRequests();
  const { data: products = [] } = useListProducts();

  const createM = useCreatePurchaseRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
        toast({ title: "Solicitação criada com sucesso!" });
        setDialogOpen(false);
      },
      onError: () => toast({ title: "Erro ao criar solicitação", variant: "destructive" }),
    },
  });

  const approveM = useApprovePurchaseRequest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/purchase-requests"] });
        toast({ title: "Solicitação aprovada!" });
        setSelected((prev: any) => prev ? { ...prev, status: "aprovada" } : null);
      },
    },
  });

  const form = useForm<ReqForm>({ defaultValues: dfv });

  const onSubmit = (data: ReqForm) =>
    createM.mutate({
      data: {
        productId: data.productId,
        quantity: parseFloat(data.quantity),
        neededDate: data.neededDate || null,
        source: data.source,
        notes: data.description,
      } as any,
    });

  const columns = [
    {
      key: "requestNumber",
      header: "Nº SC",
      className: "font-mono text-xs w-[100px]",
    },
    {
      key: "productCode",
      header: "Código",
      className: "font-mono text-xs w-[110px]",
    },
    {
      key: "productName",
      header: "Produto",
      render: (r: any) => <span className="font-medium">{r.productName}</span>,
    },
    {
      key: "notes",
      header: "Descrição",
      render: (r: any) =>
        r.notes ? (
          <span className="text-muted-foreground text-xs line-clamp-1 max-w-[220px]">{r.notes}</span>
        ) : (
          <span className="text-muted-foreground text-xs italic">–</span>
        ),
    },
    {
      key: "quantity",
      header: "Qtd",
      className: "text-right w-[80px]",
      render: (r: any) => parseFloat(r.quantity).toFixed(2),
    },
    {
      key: "source",
      header: "Origem",
      className: "w-[120px]",
      render: (r: any) => SOURCES.find((s) => s.value === r.source)?.label ?? r.source,
    },
    {
      key: "neededDate",
      header: "Necessidade",
      className: "w-[110px]",
      render: (r: any) =>
        r.neededDate
          ? format(new Date(r.neededDate), "dd/MM/yy", { locale: ptBR })
          : "–",
    },
    {
      key: "status",
      header: "Status",
      className: "w-[110px]",
      render: (r: any) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Solicitações de Compra"
        description="Solicitações de reposição de materiais."
        onNew={() => {
          form.reset(dfv);
          setDialogOpen(true);
        }}
        newLabel="Nova Solicitação"
      />

      <DataTable
        data={rows as any[]}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="Nenhuma solicitação encontrada."
        onRowClick={(row) => setSelected(row)}
        actions={(row) => (
          <div className="flex gap-1 justify-end">
            {(row as any).status === "aberta" && (
              <Button
                size="icon"
                variant="ghost"
                className="text-emerald-600"
                title="Aprovar"
                onClick={(e) => {
                  e.stopPropagation();
                  approveM.mutate({ id: (row as any).id });
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      />

      {/* ── Painel de detalhes ────────────────────────── */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-[420px] sm:w-[480px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base font-semibold">
                Solicitação de Compra
              </SheetTitle>
              <span className="font-mono text-sm font-bold text-primary">
                {selected?.requestNumber}
              </span>
            </div>
            <div className="mt-1">
              {selected && (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[selected.status] ?? ""}`}
                >
                  {selected.status?.charAt(0).toUpperCase() + selected.status?.slice(1)}
                </span>
              )}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Produto */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Produto
              </h3>
              <div className="space-y-3">
                <DetailItem icon={Hash} label="Código" value={selected?.productCode} />
                <DetailItem icon={Package} label="Produto" value={selected?.productName} />
                <DetailItem
                  icon={Package}
                  label="Quantidade solicitada"
                  value={selected ? `${parseFloat(selected.quantity).toFixed(2)}` : undefined}
                />
              </div>
            </section>

            <Separator />

            {/* Datas e origem */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Informações
              </h3>
              <div className="space-y-3">
                <DetailItem
                  icon={User}
                  label="Origem"
                  value={SOURCES.find((s) => s.value === selected?.source)?.label ?? selected?.source}
                />
                <DetailItem
                  icon={Calendar}
                  label="Data de necessidade"
                  value={
                    selected?.neededDate
                      ? format(new Date(selected.neededDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      : "Não informada"
                  }
                />
                <DetailItem
                  icon={Calendar}
                  label="Criado em"
                  value={
                    selected?.createdAt
                      ? format(new Date(selected.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : undefined
                  }
                />
              </div>
            </section>

            {/* Descrição */}
            {selected?.notes && (
              <>
                <Separator />
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Descrição / Justificativa
                  </h3>
                  <div className="flex gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selected.notes}
                    </p>
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Ações */}
          {selected?.status === "aberta" && (
            <div className="border-t px-6 py-4 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => approveM.mutate({ id: selected.id })}
                disabled={approveM.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar Solicitação
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Formulário de nova solicitação ───────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Compra</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                rules={{ required: "Selecione um produto" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o produto..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {safeArray(products).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} – {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                rules={{ required: "Informe a descrição / justificativa" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição / Justificativa *</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Descreva o motivo da compra, uso previsto, urgência..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  rules={{ required: "Informe a quantidade" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade *</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="neededDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de necessidade</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOURCES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createM.isPending}>
                  {createM.isPending ? "Criando..." : "Criar Solicitação"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
