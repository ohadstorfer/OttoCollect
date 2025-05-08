
import React from "react";
import { cn } from "@/lib/utils";

export interface LabelValuePairProps {
  label: string;
  value?: string | React.ReactNode | null;
  icon?: React.ReactNode;
  iconClassNames?: string;
  className?: string;
}

export const LabelValuePair: React.FC<LabelValuePairProps> = ({
  label,
  value,
  icon,
  iconClassNames,
  className,
}) => {
  if (!value && value !== 0) return null;
  
  return (
    <div className={cn("grid grid-cols-[130px_1fr] gap-x-2 gap-y-1.5 py-1.5 border-b border-gray-100 last:border-b-0", className)}>
      <div className="text-right font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center space-x-2">
        {icon && <div className={cn("text-primary", iconClassNames)}>{icon}</div>}
        <span>{value}</span>
      </div>
    </div>
  );
};
