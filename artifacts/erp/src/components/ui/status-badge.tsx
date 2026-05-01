import { Badge, BadgeProps } from "./badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends BadgeProps {
  status: string;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  if (!status) return null;
  const normalizedStatus = status.toLowerCase();
  
  let variantClass = "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300"; // default gray
  
  if (["disponivel", "aprovado", "finalizada", "recebido_total"].includes(normalizedStatus)) {
    variantClass = "bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400";
  } else if (["reservado", "em_producao", "liberada", "enviado"].includes(normalizedStatus)) {
    variantClass = "bg-blue-100 text-blue-800 hover:bg-blue-100/80 dark:bg-blue-900/30 dark:text-blue-400";
  } else if (["aguardando_material", "aguardando_maquina", "em_inspecao", "rascunho", "aberta"].includes(normalizedStatus)) {
    variantClass = "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400";
  } else if (["falta_estoque", "reprovado", "cancelada", "urgente"].includes(normalizedStatus)) {
    variantClass = "bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400";
  } else if (["planejada", "normal", "baixa"].includes(normalizedStatus)) {
    variantClass = "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-300";
  } else if (["alta", "pronto_expedicao"].includes(normalizedStatus)) {
    variantClass = "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-400";
  } else if (["mrp", "pcp", "usinar", "montar", "fabricar"].includes(normalizedStatus)) {
    variantClass = "bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80 dark:bg-indigo-900/30 dark:text-indigo-400";
  }

  const formatStatus = (s: string) => {
    return s.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Badge className={cn("font-medium border-transparent", variantClass, className)} {...props}>
      {formatStatus(status)}
    </Badge>
  );
}
