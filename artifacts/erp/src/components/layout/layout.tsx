import React from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Package, Users, Truck, Factory, Activity, 
  Settings, FolderTree, GitMerge, Box, ArrowLeftRight, Bookmark,
  ShoppingCart, Search, Truck as ShipIcon, Cpu, ListChecks, DollarSign,
  ClipboardCheck, FileWarning, AlertTriangle, ChevronDown, Menu
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const navGroups = [
  {
    title: "Geral",
    icon: LayoutDashboard,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Cadastros",
    icon: FolderTree,
    items: [
      { href: "/produtos", label: "Produtos", icon: Package },
      { href: "/clientes", label: "Clientes", icon: Users },
      { href: "/fornecedores", label: "Fornecedores", icon: Truck },
      { href: "/setores", label: "Setores", icon: Factory },
      { href: "/maquinas", label: "Máquinas", icon: Cpu },
      { href: "/operacoes", label: "Operações", icon: Activity },
    ]
  },
  {
    title: "Engenharia",
    icon: Settings,
    items: [
      { href: "/ficha-tecnica", label: "Ficha Técnica (BOM)", icon: GitMerge },
      { href: "/roteiros", label: "Roteiros de Fabricação", icon: GitMerge },
      { href: "/engenharia/documentos", label: "Documentos Técnicos", icon: FileWarning },
    ]
  },
  {
    title: "Estoque",
    icon: Box,
    items: [
      { href: "/estoque", label: "Saldos", icon: Box },
      { href: "/estoque/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
      { href: "/estoque/reservas", label: "Reservas", icon: Bookmark },
    ]
  },
  {
    title: "Vendas",
    icon: ShoppingCart,
    items: [
      { href: "/vendas/pedidos", label: "Pedidos de Venda", icon: ShoppingCart },
      { href: "/vendas/disponibilidade", label: "Disponibilidade", icon: Search },
      { href: "/vendas/expedicao", label: "Expedição", icon: ShipIcon },
    ]
  },
  {
    title: "PCP & MRP",
    icon: Activity,
    items: [
      { href: "/pcp/mrp", label: "Rodar MRP", icon: Activity },
      { href: "/pcp/necessidades-producao", label: "Necessidades Produção", icon: Factory },
      { href: "/pcp/necessidades-compra", label: "Necessidades Compra", icon: ShoppingCart },
    ]
  },
  {
    title: "Produção",
    icon: Factory,
    items: [
      { href: "/producao/ordens", label: "Ordens de Produção", icon: ClipboardCheck },
      { href: "/producao/usinagem", label: "Fila Usinagem", icon: Settings },
      { href: "/producao/montagem", label: "Fila Montagem", icon: Package },
      { href: "/producao/apontamentos", label: "Apontamentos", icon: ListChecks },
    ]
  },
  {
    title: "Compras",
    icon: DollarSign,
    items: [
      { href: "/compras/solicitacoes", label: "Solicitações", icon: FileWarning },
      { href: "/compras/pedidos", label: "Pedidos de Compra", icon: ShoppingCart },
      { href: "/compras/recebimentos", label: "Recebimentos", icon: Truck },
    ]
  },
  {
    title: "Qualidade",
    icon: ListChecks,
    items: [
      { href: "/qualidade/inspecoes", label: "Inspeções", icon: ListChecks },
    ]
  },
  {
    title: "Relatórios",
    icon: AlertTriangle,
    items: [
      { href: "/relatorios/estoque-baixo", label: "Estoque Baixo", icon: AlertTriangle },
      { href: "/relatorios/producao-atrasada", label: "Produção Atrasada", icon: AlertTriangle },
      { href: "/relatorios/compras-pendentes", label: "Compras Pendentes", icon: FileWarning },
    ]
  }
];

export function Sidebar({ isMobileOpen, setMobileOpen }: { isMobileOpen?: boolean, setMobileOpen?: (v: boolean) => void }) {
  const [location] = useLocation();

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-transform transform lg:translate-x-0 overflow-y-auto flex flex-col",
      isMobileOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Factory className="w-5 h-5 text-sidebar-primary" />
          ERP Invel
        </h2>
        {setMobileOpen && (
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>
      
      <div className="flex-1 py-4 px-3 space-y-1">
        {navGroups.map((group, i) => {
          const isGroupActive = group.items.some(item => location === item.href || location.startsWith(item.href + "/"));
          
          return (
            <Collapsible key={i} defaultOpen={isGroupActive || group.title === "Geral"}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors group">
                <div className="flex items-center gap-2">
                  <group.icon className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                  {group.title}
                </div>
                <ChevronDown className="w-4 h-4 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 pr-2 space-y-1 mt-1">
                {group.items.map((item, j) => {
                  const isActive = location === item.href;
                  return (
                    <Link key={j} href={item.href}>
                      <div className={cn(
                        "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors cursor-pointer",
                        isActive 
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" 
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}>
                        {item.label}
                      </div>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/50">
        Invel Metalúrgica v1.0
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isMobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex h-14 bg-background border-b items-center gap-4 px-4 sm:px-6 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="-ml-2">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="font-semibold flex items-center gap-2">
            <Factory className="w-5 h-5" />
            ERP Invel
          </div>
        </header>
        
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
