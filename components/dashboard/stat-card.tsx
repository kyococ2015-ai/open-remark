import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComponentType } from "react";

type Props = {
  title: string;
  value: number | string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  description?: string;
  variant?: "default" | "warning" | "success" | "destructive";
};

const variantClasses = {
  default: {
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
  },
  warning: {
    value: "text-warning",
    icon: "bg-warning/10 text-warning",
  },
  success: {
    value: "text-success",
    icon: "bg-success/10 text-success",
  },
  destructive: {
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: Props) {
  const classes = variantClasses[variant];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`flex size-8 items-center justify-center rounded-md ${classes.icon}`}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold tabular-nums ${classes.value}`}>
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
