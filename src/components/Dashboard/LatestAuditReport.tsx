
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

interface KPI {
  metric: string;
  value: string;
  trend: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  difficulty: string;
}

interface AuditReport {
  id: string;
  created_at: string;
  summary: string;
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
      if (!data) return null;

      const parsedData: AuditReport = {
        id: data.id,
        created_at: data.created_at,
        summary: data.summary,
        kpis: Array.isArray(data.kpis) ? data.kpis.map((kpi: any) => ({
          metric: kpi.metric || '',
          value: kpi.value || '',
          trend: kpi.trend || '',
        })) : [],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations.map((rec: any) => ({
          title: rec.title || '',
          description: rec.description || '',
          impact: rec.impact || '',
          difficulty: rec.difficulty || '',
        })) : [],
      };

      return parsedData;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  useEffect(() => {
    const channel = supabase
      .channel('latest-audit-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'financial_audits'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['latest-audit'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleExport = async () => {
    try {
      const kpisCSV = latestAudit?.kpis.map(kpi => 
        `${kpi.metric},${kpi.value},${kpi.trend}`
      ).join('\n');
      
      const recommendationsCSV = latestAudit?.recommendations.map(rec =>
        `${rec.title},${rec.description},${rec.impact},${rec.difficulty}`
      ).join('\n');

      const csvContent = `
AI Profit Audit Report
Generated on: ${new Date(latestAudit?.created_at || '').toLocaleDateString()}

Executive Summary:
${latestAudit?.summary}

KPIs:
Metric,Value,Trend
${kpisCSV}

Recommendations:
Title,Description,Impact,Difficulty
${recommendationsCSV}
      `.trim();

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
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
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Latest Audit Results</h3>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            Generated on {format(new Date(latestAudit.created_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['latest-audit'] })}
          >
            <RefreshCcw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={handleChatWithAI}
            size="sm"
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            AI Assistant
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {latestAudit.kpis.map((kpi, index) => (
          <Card key={index} className="p-4">
            <div className="text-sm text-muted-foreground">{kpi.metric}</div>
            <div className="text-lg font-semibold mt-1">{kpi.value}</div>
            <div className={`text-sm mt-1 ${
              kpi.trend.includes('+') ? 'text-green-600' : 'text-red-600'
            }`}>
              {kpi.trend}
            </div>
          </Card>
        ))}
      </div>

      <ScrollArea className="h-[500px] rounded-md border p-4">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Executive Summary</h4>
            <p className="text-muted-foreground">{latestAudit?.summary}</p>
          </div>

          <div>
            <h4 className="font-medium mb-2">Recommendations</h4>
            <div className="space-y-4">
              {latestAudit?.recommendations.map((rec, index) => (
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
