import type { ComponentType } from "react";

type Props = {
  title: string;
  value: number | string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  description?: string;
  variant?: "default" | "warning" | "success" | "destructive";
};

const valueColor = {
  default: "text-foreground",
  warning: "text-warning",
  success: "text-success",
  destructive: "text-destructive",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className={`text-3xl font-bold tabular-nums ${valueColor[variant]}`}>
        {value}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
