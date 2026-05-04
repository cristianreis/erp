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
import StockReservations from "@/pages/stock/reservations";
import SalesOrders from "@/pages/sales/orders";
import StockAvailability from "@/pages/sales/availability";
import Shipping from "@/pages/sales/shipping";
import ProductionOrders from "@/pages/production/orders";
import ProductionAppointments from "@/pages/production/appointments";
import { ProductionQueue } from "@/pages/production/queue";
import BomPage from "@/pages/engineering/bom";
import Routings from "@/pages/engineering/routings";
import DocumentsPage from "@/pages/engineering/documents";
import PurchaseRequests from "@/pages/purchasing/requests";
import PurchaseOrders from "@/pages/purchasing/orders";
import Receipts from "@/pages/purchasing/receipts";
import QualityInspections from "@/pages/quality/inspections";
import MrpPage from "@/pages/pcp/mrp";
import ProductionNeeds from "@/pages/pcp/production-needs";
import PurchaseNeeds from "@/pages/pcp/purchase-needs";
import LowStockReport from "@/pages/reports/low-stock";
import DelayedProductionReport from "@/pages/reports/delayed-production";
import PendingPurchasesReport from "@/pages/reports/pending-purchases";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Prevent stale non-array data from sneaking through when backend is down.
      // When the API server is offline, Vite serves the SPA index.html for /api/*
      // routes with 200 OK. customFetch then returns a string (HTML), which React
      // Query stores as `data`. Pages expect arrays, so .map() / .filter() crash.
      // This structuralSharing: false + the select below prevents that.
    },
    mutations: {
      retry: 0,
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
        <Route path="/engenharia/documentos" component={DocumentsPage} />

        <Route path="/estoque" component={StockBalances} />
        <Route path="/estoque/movimentacoes" component={StockMovements} />
        <Route path="/estoque/reservas" component={StockReservations} />

        <Route path="/vendas/pedidos" component={SalesOrders} />
        <Route path="/vendas/disponibilidade" component={StockAvailability} />
        <Route path="/vendas/expedicao" component={Shipping} />

        <Route path="/pcp/mrp" component={MrpPage} />
        <Route path="/pcp/necessidades-producao" component={ProductionNeeds} />
        <Route path="/pcp/necessidades-compra" component={PurchaseNeeds} />

        <Route path="/producao/ordens" component={ProductionOrders} />
        <Route path="/producao/usinagem" component={() => <ProductionQueue orderType="usinagem" title="Fila de Usinagem" description="Ordens de produção do tipo usinagem em andamento." />} />
        <Route path="/producao/montagem" component={() => <ProductionQueue orderType="montagem" title="Fila de Montagem" description="Ordens de produção do tipo montagem em andamento." />} />
        <Route path="/producao/apontamentos" component={ProductionAppointments} />

        <Route path="/compras/solicitacoes" component={PurchaseRequests} />
        <Route path="/compras/pedidos" component={PurchaseOrders} />
        <Route path="/compras/recebimentos" component={Receipts} />

        <Route path="/qualidade/inspecoes" component={QualityInspections} />

        <Route path="/relatorios/estoque-baixo" component={LowStockReport} />
        <Route path="/relatorios/producao-atrasada" component={DelayedProductionReport} />
        <Route path="/relatorios/compras-pendentes" component={PendingPurchasesReport} />

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
