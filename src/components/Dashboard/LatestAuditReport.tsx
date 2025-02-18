
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { SpreadsheetAnalysis } from "@/types/spreadsheet";

export function LatestAuditReport() {
  const [report, setReport] = useState<SpreadsheetAnalysis | null>(null);

  const handleUploadSuccess = (result: any) => {
    if (!result?.analysis) {
      toast.error("No analysis results found in the upload");
      return;
    }
    setReport(result.analysis);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Upload Financial Data</h2>
        <FileUpload onUploadSuccess={handleUploadSuccess} />
      </Card>

      {report && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">AI Audit Report</h3>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {report.ai_analysis && (
                <div>
                  <h4 className="font-medium mb-2">Analysis</h4>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {report.ai_analysis}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Financial Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Total Revenue:</span>
                    <p className="text-lg font-medium">
                      £{report.financial_metrics.total_revenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Total Cost:</span>
                    <p className="text-lg font-medium">
                      £{report.financial_metrics.total_cost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Profit Margin:</span>
                    <p className="text-lg font-medium">
                      {report.financial_metrics.profit_margin.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Expense Ratio:</span>
                    <p className="text-lg font-medium">
                      {report.financial_metrics.expense_ratio.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
