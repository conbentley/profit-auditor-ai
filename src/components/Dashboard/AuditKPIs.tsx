
import { Card } from "@/components/ui/card";
import { KPI } from "@/types/audit";

interface AuditKPIsProps {
  kpis: KPI[];
}

export function AuditKPIs({ kpis }: AuditKPIsProps) {
  return (
    <div>
      <h4 className="font-medium mb-2">Key Performance Indicators</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className="p-4">
            <div className="text-sm text-muted-foreground">{kpi.metric}</div>
            <div className="text-lg font-semibold mt-1">{kpi.value}</div>
            {kpi.trend && (
              <div className={`text-sm mt-1 ${
                kpi.trend.includes('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.trend}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
