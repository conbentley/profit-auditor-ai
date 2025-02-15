
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MonthlyMetrics {
  revenue: number;
  profit_margin: number;
  expense_ratio: number;
  audit_alerts: number;
  previous_month: {
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

      const { data, error } = await supabase
        .from('financial_audits')
        .select('monthly_metrics, audit_date')
        .eq('user_id', user.id)
        .order('audit_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        return {
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
      }

      const currentMetrics = data.monthly_metrics as MonthlyMetrics;
      const previousMetrics = currentMetrics.previous_month;

      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };

      return {
        metrics: {
          revenue: currentMetrics.revenue,
          profit_margin: currentMetrics.profit_margin,
          expense_ratio: currentMetrics.expense_ratio,
          audit_alerts: currentMetrics.audit_alerts
        },
        changes: {
          revenue: calculateChange(currentMetrics.revenue, previousMetrics.revenue),
          profit_margin: calculateChange(currentMetrics.profit_margin, previousMetrics.profit_margin),
          expense_ratio: calculateChange(currentMetrics.expense_ratio, previousMetrics.expense_ratio),
          audit_alerts: calculateChange(currentMetrics.audit_alerts, previousMetrics.audit_alerts)
        }
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}
