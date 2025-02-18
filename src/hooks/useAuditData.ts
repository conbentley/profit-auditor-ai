
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DatabaseAudit } from "@/types/audit";

export const useAuditData = () => {
  return useQuery({
    queryKey: ['latest-audit'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('financial_audits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      const monthlyMetrics = data.monthly_metrics as Record<string, any>;
      const processedData: DatabaseAudit = {
        id: data.id,
        created_at: data.created_at,
        user_id: data.user_id,
        audit_date: data.audit_date,
        summary: data.summary,
        monthly_metrics: {
          revenue: Number(monthlyMetrics?.revenue ?? 0),
          profit_margin: Number(monthlyMetrics?.profit_margin ?? 0),
          expense_ratio: Number(monthlyMetrics?.expense_ratio ?? 0),
          audit_alerts: Number(monthlyMetrics?.audit_alerts ?? 0),
          previous_month: {
            revenue: Number(monthlyMetrics?.previous_month?.revenue ?? 0),
            profit_margin: Number(monthlyMetrics?.previous_month?.profit_margin ?? 0),
            expense_ratio: Number(monthlyMetrics?.previous_month?.expense_ratio ?? 0),
            audit_alerts: Number(monthlyMetrics?.previous_month?.audit_alerts ?? 0),
          }
        },
        kpis: (data.kpis as any[] ?? []).map((kpi: any) => ({
          metric: String(kpi?.metric ?? ''),
          value: String(kpi?.value ?? ''),
          trend: kpi?.trend ? String(kpi.trend) : undefined
        })),
        recommendations: (data.recommendations as any[] ?? []).map((rec: any) => ({
          title: String(rec?.title ?? ''),
          description: String(rec?.description ?? ''),
          impact: String(rec?.impact ?? 'Medium'),
          difficulty: String(rec?.difficulty ?? 'Medium')
        }))
      };

      return processedData;
    },
    refetchInterval: 30000,
  });
};
