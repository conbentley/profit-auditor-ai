
import { Card } from "@/components/ui/card";
import { DatabaseAudit } from "@/types/audit";
import { formatCurrency, formatPercentage } from "@/utils/formatters";

interface AuditMetricsProps {
  metrics: DatabaseAudit['monthly_metrics'];
}

export function AuditMetrics({ metrics }: AuditMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Total Revenue</div>
        <div className="text-lg font-semibold mt-1">
          {formatCurrency(metrics.revenue)}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Profit Margin</div>
        <div className="text-lg font-semibold mt-1">
          {formatPercentage(metrics.profit_margin)}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Expense Ratio</div>
        <div className="text-lg font-semibold mt-1">
          {formatPercentage(metrics.expense_ratio)}
        </div>
      </Card>
    </div>
  );
}
