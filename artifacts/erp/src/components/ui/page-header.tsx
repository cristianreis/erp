import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  onNew?: () => void;
  newLabel?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, onNew, newLabel = "Novo", children }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        {onNew && (
          <Button onClick={onNew}>
            <Plus className="h-4 w-4 mr-2" />
            {newLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
