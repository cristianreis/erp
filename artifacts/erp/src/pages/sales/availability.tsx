import React, { useState } from "react";
import { useListProducts, useGetStockAvailability } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PackageSearch } from "lucide-react";

export default function StockAvailability() {
  const [productId, setProductId] = useState<string>("");
  const { data: products = [] } = useListProducts();
  const { data: avail, isLoading } = useGetStockAvailability(productId, {
    query: { enabled: !!productId },
  });

  const a = avail as any;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Disponibilidade de Estoque" description="Consulte a disponibilidade detalhada por produto." />
      <div className="max-w-sm">
        <label className="text-sm font-medium mb-1 block">Selecione o Produto</label>
        <Select onValueChange={setProductId} value={productId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto..." />
          </SelectTrigger>
          <SelectContent>
            {(products as any[]).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.code} – {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!productId && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PackageSearch className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">Selecione um produto para consultar sua disponibilidade.</p>
        </div>
      )}

      {productId && isLoading && (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      )}

      {productId && !isLoading && a && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{parseFloat(a.totalStock ?? 0).toFixed(2)}</div><p className="text-xs text-muted-foreground">{a.unit}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Reservado</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-amber-600">{parseFloat(a.reservedStock ?? 0).toFixed(2)}</div><p className="text-xs text-muted-foreground">para pedidos</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Disponível</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${parseFloat(a.availableStock ?? 0) > 0 ? "text-emerald-600" : "text-red-600"}`}>
                {parseFloat(a.availableStock ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">para uso imediato</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Estoque Mínimo</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-500">{parseFloat(a.minimumStock ?? 0).toFixed(2)}</div>
              <div className="mt-1">
                {parseFloat(a.availableStock ?? 0) < parseFloat(a.minimumStock ?? 0)
                  ? <Badge className="bg-red-100 text-red-800 text-xs">Abaixo do Mínimo</Badge>
                  : <Badge className="bg-emerald-100 text-emerald-800 text-xs">OK</Badge>}
              </div>
            </CardContent>
          </Card>

          {a.balancesByWarehouse && (a.balancesByWarehouse as any[]).length > 0 && (
            <div className="col-span-full">
              <h3 className="text-sm font-semibold mb-2">Saldo por Almoxarifado</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2">Almoxarifado</th>
                      <th className="text-right px-4 py-2">Saldo</th>
                      <th className="text-right px-4 py-2">Reservado</th>
                      <th className="text-right px-4 py-2">Disponível</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(a.balancesByWarehouse as any[]).map((b: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2 font-medium">{b.warehouseName}</td>
                        <td className="px-4 py-2 text-right">{parseFloat(b.totalStock ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-amber-600">{parseFloat(b.reservedStock ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right text-emerald-700 font-semibold">{parseFloat(b.availableStock ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
