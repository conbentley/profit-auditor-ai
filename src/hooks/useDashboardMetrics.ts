
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuditMetricsHistory {
  metrics: {
    revenue: number;
    profit_margin: number;
    expense_ratio: number;
    audit_alerts: number;
  };
  changes: {
    revenue: number;
    profit_margin: number;
    expense_ratio: number;
    audit_alerts: number;
  };
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the latest audit metrics history records for each metric type
      const { data: metricsData, error } = await supabase
        .from('audit_metrics_history')
        .select('*')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(3);  // Get the latest record for each metric type

      if (error) throw error;

      const metrics: AuditMetricsHistory = {
        metrics: {
          revenue: 0,
          profit_margin: 0,
          expense_ratio: 0,
          audit_alerts: 0
        },
        changes: {
          revenue: 0,
          profit_margin: 0,
          expense_ratio: 0,
          audit_alerts: 0
        }
      };

      // Process the metrics data
      metricsData.forEach(record => {
        const metricType = record.metric_type as keyof typeof metrics.metrics;
        metrics.metrics[metricType] = record.metric_value;
        metrics.changes[metricType] = record.change_percentage || 0;
      });

      return metrics;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}
