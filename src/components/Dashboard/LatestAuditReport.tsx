
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCcw, MessageSquare, Download, Clock, FileSpreadsheet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuditData } from "@/hooks/useAuditData";
import { AuditMetrics } from "./AuditMetrics";
import { AuditKPIs } from "./AuditKPIs";
import { AuditRecommendations } from "./AuditRecommendations";
import { supabase } from "@/integrations/supabase/client";
import type { SpreadsheetUpload } from "@/types/spreadsheet";

export function LatestAuditReport() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: latestAudit, isLoading, isError } = useAuditData();

  const handleViewSpreadsheets = () => {
    navigate('/integrations');
  };

  const handleExport = async () => {
    if (!latestAudit) return;
    
    try {
      const csvContent = `
AI Profit Audit Report
Generated on: ${format(new Date(latestAudit.created_at), "MMM d, yyyy 'at' h:mm a")}

Executive Summary:
${latestAudit.summary}

Monthly Metrics:
Revenue: £${latestAudit.monthly_metrics.revenue.toLocaleString('en-GB', { maximumFractionDigits: 2 })}
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
      <div className="text-center p-6 space-y-4">
        <p className="text-muted-foreground">
          No audit generated yet. Upload and process your spreadsheets to get AI-powered insights.
        </p>
        <Button onClick={handleViewSpreadsheets} variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Upload Spreadsheets
        </Button>
      </div>
    );
  }

  // Get the latest spreadsheet analysis
  const { data: spreadsheetData } = useQuery<SpreadsheetUpload>({
    queryKey: ['latest-spreadsheet'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('spreadsheet_uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('processed', true)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data as SpreadsheetUpload;
    }
  });

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

      <AuditMetrics metrics={latestAudit.monthly_metrics} />

      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-6">
          <div>
            <h4 className="font-medium mb-2">Analysis Summary</h4>
            <p className="text-muted-foreground whitespace-pre-line">{latestAudit.summary}</p>
          </div>

          {spreadsheetData?.analysis_results?.ai_analysis && (
            <div>
              <h4 className="font-medium mb-2">AI Insights from Spreadsheet Data</h4>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-muted-foreground whitespace-pre-line">
                  {spreadsheetData.analysis_results.ai_analysis}
                </p>
              </div>
            </div>
          )}

          <AuditKPIs kpis={latestAudit.kpis} />
          <AuditRecommendations recommendations={latestAudit.recommendations} />
        </div>
      </ScrollArea>
    </div>
  );
}
