import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

type Props = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  variant?: "default" | "warning" | "success" | "destructive";
};

const variantClasses = {
  default: {
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
  },
  warning: {
    value: "text-amber-600 dark:text-amber-400",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  success: {
    value: "text-green-600 dark:text-green-400",
    icon: "bg-green-500/10 text-green-600 dark:text-green-400",
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
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${classes.icon}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
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
