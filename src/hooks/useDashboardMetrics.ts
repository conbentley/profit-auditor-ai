
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

// Helper function to validate the shape of monthly metrics
function isValidMonthlyMetrics(data: unknown): data is MonthlyMetrics {
  if (!data || typeof data !== 'object') return false;
  
  const metrics = data as Record<string, unknown>;
  
  const hasRequiredProperties = 
    typeof metrics.revenue === 'number' &&
    typeof metrics.profit_margin === 'number' &&
    typeof metrics.expense_ratio === 'number' &&
    typeof metrics.audit_alerts === 'number' &&
    metrics.previous_month && typeof metrics.previous_month === 'object';
    
  if (!hasRequiredProperties) return false;
  
  const previousMonth = metrics.previous_month as Record<string, unknown>;
  
  return (
    typeof previousMonth.revenue === 'number' &&
    typeof previousMonth.profit_margin === 'number' &&
    typeof previousMonth.expense_ratio === 'number' &&
    typeof previousMonth.audit_alerts === 'number'
  );
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
      
      if (!data || !isValidMonthlyMetrics(data.monthly_metrics)) {
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

      const currentMetrics = data.monthly_metrics;
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
