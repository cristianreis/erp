import React, { useState } from "react";
import { safeArray } from "@/lib/safe-array";
import { useQueryClient } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { Plus, FileText, Upload, Eye, Trash2, CheckCircle, Clock, AlertTriangle, XCircle, FileImage, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation } from "@tanstack/react-query";

const DOCUMENT_TYPES: Record<string, string> = {
  desenho_tecnico: "Desenho Técnico",
  instrucao_trabalho: "Instrução de Trabalho",
  checklist: "Checklist",
  foto: "Foto/Imagem",
  certificado: "Certificado",
  ficha_tecnica: "Ficha Técnica",
  plano_controle: "Plano de Controle",
  outro: "Outro",
};

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  em_desenvolvimento: { label: "Em Desenvolvimento", className: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-3 w-3" /> },
  em_analise: { label: "Em Análise", className: "bg-blue-100 text-blue-800", icon: <Eye className="h-3 w-3" /> },
  aprovado: { label: "Aprovado", className: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="h-3 w-3" /> },
  liberado: { label: "Liberado", className: "bg-green-100 text-green-800", icon: <CheckCircle className="h-3 w-3" /> },
  obsoleto: { label: "Obsoleto", className: "bg-gray-100 text-gray-600", icon: <XCircle className="h-3 w-3" /> },
  bloqueado: { label: "Bloqueado", className: "bg-red-100 text-red-800", icon: <AlertTriangle className="h-3 w-3" /> },
};

type DocForm = {
  productId: string;
  name: string;
  description: string;
  documentType: string;
  revision: string;
  status: string;
  changeReason: string;
  responsiblePerson: string;
  approvedBy: string;
  notes: string;
};

const dfv: DocForm = {
  productId: "",
  name: "",
  description: "",
  documentType: "desenho_tecnico",
  revision: "Rev.00",
  status: "em_desenvolvimento",
  changeReason: "",
  responsiblePerson: "",
  approvedBy: "",
  notes: "",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-800", icon: null };
  return (
    <Badge className={`gap-1 text-xs ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </Badge>
  );
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "–";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentUploadDialog({
  open,
  onOpenChange,
  documentId,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  documentId: string;
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Falha ao obter URL de upload");
      const { uploadURL, objectPath } = await res.json();

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload falhou")));
        xhr.onerror = () => reject(new Error("Upload falhou"));
        xhr.open("PUT", uploadURL);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath, fileSize: file.size, mimeType: file.type }),
      });

      toast({ title: "Arquivo enviado com sucesso!" });
      onUploaded();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Erro ao enviar arquivo", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Anexar Arquivo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => document.getElementById("doc-file-input")?.click()}
          >
            {file ? (
              <div className="space-y-1">
                <FileText className="h-8 w-8 mx-auto text-primary" />
                <p className="font-medium text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Clique para selecionar PDF, imagem ou documento</p>
                <p className="text-xs text-muted-foreground">PDF, PNG, JPG, DWG, DOCX (máx. 50MB)</p>
              </div>
            )}
            <input
              id="doc-file-input"
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.dwg,.docx,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Enviando...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Enviando..." : "Enviar Arquivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DocumentsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialog, setUploadDialog] = useState<string | null>(null);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("todos");

  const { data: products = [] } = useListProducts();
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/documents", filterProduct],
    queryFn: async () => {
      const url = filterProduct && filterProduct !== "all"
        ? `/api/documents?productId=${filterProduct}`
        : "/api/documents";
      const res = await fetch(url);
      return res.json();
    },
  });

  const createM = useMutation({
    mutationFn: async (data: DocForm) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar documento");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Documento criado!" });
      setDialogOpen(false);
    },
  });

  const updateStatusM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/documents"] }),
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Documento excluído" });
    },
  });

  const form = useForm<DocForm>({ defaultValues: dfv });
  const onSubmit = (data: DocForm) => createM.mutate(data);

  const filteredDocs = activeTab === "todos" ? documents : documents.filter((d: any) => d.status === activeTab);

  const columns = [
    {
      key: "name", header: "Nome do Documento",
      render: (r: any) => (
        <div className="flex items-center gap-2">
          {r.mimeType?.includes("image") ? <FileImage className="h-4 w-4 text-blue-500 shrink-0" /> : <FileText className="h-4 w-4 text-red-500 shrink-0" />}
          <div>
            <p className="font-medium text-sm">{r.name}</p>
            {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
          </div>
        </div>
      )
    },
    { key: "productName", header: "Produto", render: (r: any) => <span className="text-sm">{r.productCode} – {r.productName}</span> },
    { key: "documentType", header: "Tipo", render: (r: any) => <span className="text-xs">{DOCUMENT_TYPES[r.documentType] ?? r.documentType}</span> },
    { key: "revision", header: "Revisão", render: (r: any) => <Badge variant="outline" className="font-mono text-xs">{r.revision}</Badge> },
    { key: "status", header: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    {
      key: "fileSize", header: "Arquivo",
      render: (r: any) => r.objectPath
        ? <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" />{formatBytes(r.fileSize)}</span>
        : <span className="text-xs text-muted-foreground">Sem arquivo</span>
    },
    { key: "responsiblePerson", header: "Responsável", render: (r: any) => r.responsiblePerson ?? "–" },
    { key: "updatedAt", header: "Atualizado", render: (r: any) => format(new Date(r.updatedAt), "dd/MM/yy HH:mm", { locale: ptBR }) },
    {
      key: "actions", header: "",
      render: (r: any) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setUploadDialog(r.id)}>
            <Upload className="h-3 w-3 mr-1" />Arquivo
          </Button>
          <Select value={r.status} onValueChange={(v) => updateStatusM.mutate({ id: r.id, status: v })}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => {
            if (confirm("Excluir este documento?")) deleteM.mutate(r.id);
          }}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    },
  ];

  const stats = {
    total: documents.length,
    liberado: documents.filter((d: any) => d.status === "liberado").length,
    em_analise: documents.filter((d: any) => d.status === "em_analise").length,
    obsoleto: documents.filter((d: any) => d.status === "obsoleto").length,
    comArquivo: documents.filter((d: any) => d.objectPath).length,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Documentos Técnicos"
        description="Gestão de documentos, desenhos e instruções com controle de revisão."
        onNew={() => { form.reset(dfv); setDialogOpen(true); }}
        newLabel="Novo Documento"
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, className: "border-l-4 border-l-blue-400" },
          { label: "Liberados", value: stats.liberado, className: "border-l-4 border-l-green-500" },
          { label: "Em Análise", value: stats.em_analise, className: "border-l-4 border-l-blue-500" },
          { label: "Obsoletos", value: stats.obsoleto, className: "border-l-4 border-l-gray-400" },
          { label: "Com Arquivo", value: stats.comArquivo, className: "border-l-4 border-l-emerald-500" },
        ].map((s) => (
          <Card key={s.label} className={s.className}>
            <CardContent className="pt-4 pb-3">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por produto..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {safeArray(products).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todos">Todos ({documents.length})</TabsTrigger>
          <TabsTrigger value="em_desenvolvimento">Em Dev. ({documents.filter((d: any) => d.status === "em_desenvolvimento").length})</TabsTrigger>
          <TabsTrigger value="em_analise">Em Análise ({stats.em_analise})</TabsTrigger>
          <TabsTrigger value="aprovado">Aprovado</TabsTrigger>
          <TabsTrigger value="liberado">Liberado ({stats.liberado})</TabsTrigger>
          <TabsTrigger value="obsoleto">Obsoleto</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <DataTable data={filteredDocs} columns={columns} isLoading={isLoading} emptyMessage="Nenhum documento encontrado." />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Documento Técnico</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Produto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto..." /></SelectTrigger></FormControl>
                      <SelectContent>
                        {safeArray(products).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Nome do Documento *</FormLabel>
                    <FormControl><Input placeholder="Ex: Desenho Eixo Principal" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="documentType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(DOCUMENT_TYPES).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="revision" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisão</FormLabel>
                    <FormControl><Input placeholder="Rev.00" {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="responsiblePerson" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl><Input placeholder="Nome do responsável" {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea placeholder="Descreva o documento..." rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="changeReason" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Motivo da Revisão</FormLabel>
                    <FormControl><Input placeholder="Ex: Atualização de cotas" {...field} /></FormControl>
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Observações adicionais..." rows={2} {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createM.isPending}>{createM.isPending ? "Salvando..." : "Criar Documento"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {uploadDialog && (
        <DocumentUploadDialog
          open={!!uploadDialog}
          onOpenChange={(o) => { if (!o) setUploadDialog(null); }}
          documentId={uploadDialog}
          onUploaded={() => qc.invalidateQueries({ queryKey: ["/api/documents"] })}
        />
      )}
    </div>
  );
}
