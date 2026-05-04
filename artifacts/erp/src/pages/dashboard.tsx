import React from "react";
import { 
  useGetDashboardStats, 
  useGetDashboardLowStock, 
  useGetDashboardRecentMovements, 
  useGetDashboardProductionDelayed 
} from "@workspace/api-client-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  PackageSearch, 
  AlertTriangle, 
  Clock, 
  ShoppingCart, 
  CheckCircle2, 
  Factory,
  ArrowRightLeft,
  Users,
  Warehouse,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ title, value, description, icon: Icon, color }: {
  title: string;
  value: number | string | undefined;
  description: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${color ?? ""}`}>{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color ?? ""}`}>{value ?? "–"}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function toArray(data: unknown): any[] {
  return Array.isArray(data) ? data : [];
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: rawLowStock, isLoading: stockLoading } = useGetDashboardLowStock();
  const { data: rawRecentMovements, isLoading: movementsLoading } = useGetDashboardRecentMovements();
  const { data: rawDelayedProduction, isLoading: delayedLoading } = useGetDashboardProductionDelayed();

  const lowStock = toArray(rawLowStock);
  const recentMovements = toArray(rawRecentMovements);
  const delayedProduction = toArray(rawDelayedProduction);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard PCP/MRP</h1>
        <p className="text-muted-foreground">Visão geral das operações — Invel Metalúrgica</p>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Pedidos de Venda" value={(stats as any).activeSalesOrders} description="Em aberto/produção" icon={ShoppingCart} />
          <StatCard title="Ordens de Produção" value={(stats as any).activeProductionOrders} description="Em andamento" icon={Factory} />
          <StatCard title="Pedidos de Compra" value={(stats as any).openPurchaseOrders} description="Aguardando recebimento" icon={TrendingUp} />
          <StatCard title="Produtos" value={(stats as any).totalProducts} description="Cadastrados e ativos" icon={PackageSearch} />
          <StatCard title="Clientes" value={(stats as any).totalCustomers} description="Ativos" icon={Users} />
          <StatCard title="Almoxarifados" value={(stats as any).totalWarehouses} description="Ativos" icon={Warehouse} />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Alerta de Estoque Baixo
            </CardTitle>
            <CardDescription>Itens abaixo do estoque mínimo.</CardDescription>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : lowStock.length > 0 ? (
              <div className="overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                      <TableHead className="text-right">Falta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((item, idx) => (
                      <TableRow key={item.productId ?? idx}>
                        <TableCell className="font-mono text-xs">{item.productCode}</TableCell>
                        <TableCell className="truncate max-w-[150px]" title={item.productName}>
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                          {parseFloat(item.availableStock ?? 0).toFixed(0)} {item.unit}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {parseFloat(item.minimumStock ?? 0).toFixed(0)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-700 dark:text-red-300">
                          {parseFloat(item.shortage ?? 0).toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p>Nenhum item com estoque crítico.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Ordens de Produção Atrasadas
            </CardTitle>
            <CardDescription>OPs que passaram do prazo planejado.</CardDescription>
          </CardHeader>
          <CardContent>
            {delayedLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : delayedProduction.length > 0 ? (
              <div className="overflow-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OP</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {delayedProduction.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="font-mono text-xs">{op.orderNumber}</TableCell>
                        <TableCell className="truncate max-w-[120px]" title={op.productName}>
                          {op.productName}
                        </TableCell>
                        <TableCell className="text-red-600 dark:text-red-400 text-xs">
                          {op.plannedEndDate ? format(new Date(op.plannedEndDate), 'dd/MM/yy', { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={op.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mb-2 text-emerald-500" />
                <p>Nenhuma OP em atraso.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Últimas Movimentações de Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : recentMovements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Almoxarifado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Qtd</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(mov.movementDate), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs truncate max-w-[140px]">
                      <span className="font-mono">{mov.productCode}</span> {mov.productName}
                    </TableCell>
                    <TableCell className="text-xs">{mov.warehouseName}</TableCell>
                    <TableCell>
                      <StatusBadge status={mov.movementType} />
                    </TableCell>
                    <TableCell className="text-right font-medium text-xs">
                      {mov.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma movimentação recente.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
