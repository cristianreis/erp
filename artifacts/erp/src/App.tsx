import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import Products from "@/pages/products";
import Customers from "@/pages/customers";
import Suppliers from "@/pages/suppliers";
import Warehouses from "@/pages/warehouses";
import Sectors from "@/pages/sectors";
import Machines from "@/pages/machines";
import Operations from "@/pages/operations";
import StockBalances from "@/pages/stock/balances";
import StockMovements from "@/pages/stock/movements";
import SalesOrders from "@/pages/sales/orders";
import ProductionOrders from "@/pages/production/orders";
import BomPage from "@/pages/engineering/bom";
import Routings from "@/pages/engineering/routings";
import PurchaseRequests from "@/pages/purchasing/requests";
import PurchaseOrders from "@/pages/purchasing/orders";
import Receipts from "@/pages/purchasing/receipts";
import QualityInspections from "@/pages/quality/inspections";
import MrpPage from "@/pages/pcp/mrp";

const Placeholder = ({ title }: { title: string }) => (
  <div className="flex flex-col gap-4">
    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <div className="p-8 border rounded-md bg-card text-muted-foreground flex items-center justify-center">
      Em desenvolvimento...
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => <Redirect to="/dashboard" />} />
        <Route path="/dashboard" component={Dashboard} />

        <Route path="/produtos" component={Products} />
        <Route path="/clientes" component={Customers} />
        <Route path="/fornecedores" component={Suppliers} />
        <Route path="/maquinas" component={Machines} />
        <Route path="/operacoes" component={Operations} />
        <Route path="/setores" component={Sectors} />

        <Route path="/ficha-tecnica" component={BomPage} />
        <Route path="/roteiros" component={Routings} />

        <Route path="/estoque" component={StockBalances} />
        <Route path="/estoque/movimentacoes" component={StockMovements} />
        <Route path="/estoque/reservas" component={() => <Placeholder title="Reservas de Estoque" />} />

        <Route path="/vendas/pedidos" component={SalesOrders} />
        <Route path="/vendas/disponibilidade" component={() => <Placeholder title="Disponibilidade" />} />
        <Route path="/vendas/expedicao" component={() => <Placeholder title="Expedição" />} />

        <Route path="/pcp/mrp" component={MrpPage} />
        <Route path="/pcp/necessidades-producao" component={() => <Placeholder title="Necessidades de Produção" />} />
        <Route path="/pcp/necessidades-compra" component={() => <Placeholder title="Necessidades de Compra" />} />

        <Route path="/producao/ordens" component={ProductionOrders} />
        <Route path="/producao/usinagem" component={() => <Placeholder title="Fila de Usinagem" />} />
        <Route path="/producao/montagem" component={() => <Placeholder title="Fila de Montagem" />} />
        <Route path="/producao/apontamentos" component={() => <Placeholder title="Apontamentos de Produção" />} />

        <Route path="/compras/solicitacoes" component={PurchaseRequests} />
        <Route path="/compras/pedidos" component={PurchaseOrders} />
        <Route path="/compras/recebimentos" component={Receipts} />

        <Route path="/qualidade/inspecoes" component={QualityInspections} />

        <Route path="/relatorios/estoque-baixo" component={() => <Placeholder title="Relatório: Estoque Baixo" />} />
        <Route path="/relatorios/producao-atrasada" component={() => <Placeholder title="Relatório: Produção Atrasada" />} />
        <Route path="/relatorios/compras-pendentes" component={() => <Placeholder title="Relatório: Compras Pendentes" />} />

        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
