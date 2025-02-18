
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCcw, MessageSquare, Download, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

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

interface KPI {
  metric: string;
  value: string;
  trend?: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  difficulty: string;
}

interface FinancialAudit {
  id: string;
  created_at: string;
  user_id: string;
  audit_date: string;
  summary: string;
  monthly_metrics: MonthlyMetrics;
  kpis: KPI[];
  recommendations: Recommendation[];
}

export function LatestAuditReport() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: latestAudit, isLoading, isError } = useQuery({
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
      return data as FinancialAudit;
    },
    refetchInterval: 30000,
  });

  const handleExport = async () => {
    if (!latestAudit) return;
    
    try {
      const csvContent = `
AI Profit Audit Report
Generated on: ${format(new Date(latestAudit.created_at), "MMM d, yyyy 'at' h:mm a")}

Executive Summary:
${latestAudit.summary}

Monthly Metrics:
Revenue: £${latestAudit.monthly_metrics.revenue.toFixed(2)}
Profit Margin: ${latestAudit.monthly_metrics.profit_margin.toFixed(2)}%
Expense Ratio: ${latestAudit.monthly_metrics.expense_ratio.toFixed(2)}%

Recommendations:
${latestAudit.recommendations.map(rec => 
  `${rec.title}
Description: ${rec.description}
Impact: ${rec.impact}
Difficulty: ${rec.difficulty}
`).join('\n')}
      `.trim();

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Report exported successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export report");
    }
  };

  const handleChatWithAI = () => {
    navigate('/ai-profit-assistant');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        Failed to load the latest audit report.
        <Button
          variant="outline"
          size="sm"
          className="ml-2"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['latest-audit'] })}
        >
          <RefreshCcw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  if (!latestAudit) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        No audit generated yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-semibold">Latest Audit Results</h3>
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Clock className="h-4 w-4 mr-1" />
            Generated on {format(new Date(latestAudit.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['latest-audit'] })}
            className="w-full md:w-auto"
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            className="w-full md:w-auto gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={handleChatWithAI}
            size="sm"
            className="w-full md:w-auto gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Deeper Analysis
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Revenue</div>
          <div className="text-lg font-semibold mt-1">
            £{latestAudit.monthly_metrics.revenue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Profit Margin</div>
          <div className="text-lg font-semibold mt-1">
            {latestAudit.monthly_metrics.profit_margin.toFixed(2)}%
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Expense Ratio</div>
          <div className="text-lg font-semibold mt-1">
            {latestAudit.monthly_metrics.expense_ratio.toFixed(2)}%
          </div>
        </Card>
      </div>

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Analysis Summary</h4>
            <p className="text-muted-foreground whitespace-pre-line">{latestAudit.summary}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Key Performance Indicators</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestAudit.kpis.map((kpi, index) => (
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

          <div>
            <h4 className="font-medium mb-2">Recommendations</h4>
            <div className="space-y-4">
              {latestAudit.recommendations.map((rec, index) => (
                <Card key={index} className="p-4">
                  <h5 className="font-medium">{rec.title}</h5>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rec.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      Impact: {rec.impact}
                    </span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                      Difficulty: {rec.difficulty}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
