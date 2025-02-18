
export interface MonthlyMetrics {
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

export interface KPI {
  metric: string;
  value: string;
  trend?: string;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: string;
  difficulty: string;
}

export interface DatabaseAudit {
  id: string;
  created_at: string;
  user_id: string;
  audit_date: string;
  summary: string;
  monthly_metrics: MonthlyMetrics;
  kpis: KPI[];
  recommendations: Recommendation[];
}
