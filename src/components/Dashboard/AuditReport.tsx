
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LatestAuditReport } from "./LatestAuditReport";
import { useQueryClient } from "@tanstack/react-query";

export default function AuditReport() {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const generateAudit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to generate an audit");

      // Get all processed spreadsheet uploads
      const { data: uploads, error: uploadsError } = await supabase
        .from('spreadsheet_uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('processed', true)
        .order('uploaded_at', { ascending: false });

      if (uploadsError) throw uploadsError;

      // Get website analysis data
      const { data: websiteData, error: websiteError } = await supabase
        .from('website_analysis')
        .select('*')
        .eq('user_id', user.id)
        .order('last_scanned', { ascending: false })
        .limit(1)
        .single();

      if (websiteError && websiteError.code !== 'PGRST116') { // Ignore "no rows returned" error
        throw websiteError;
      }

      // If no website analysis or spreadsheet data, show error
      if (!websiteData && (!uploads || uploads.length === 0)) {
        toast.error("No website or spreadsheet data available. Please add at least one data source.");
        return;
      }

      // Clear existing audit
      await supabase
        .from('financial_audits')
        .delete()
        .eq('user_id', user.id);

      // Generate new comprehensive audit
      const response = await supabase.functions.invoke('generate-audit', {
        body: { 
          user_id: user.id,
          website_data: websiteData,
          spreadsheet_data: uploads ? uploads.map(upload => ({
            id: upload.id,
            filename: upload.filename,
            analysis_results: upload.analysis_results
          })) : [],
          has_spreadsheets: uploads && uploads.length > 0
        }
      });

      if (response.error) throw response.error;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit'] });

      toast.success(uploads && uploads.length > 0 
        ? "Comprehensive audit report generated successfully"
        : "Basic website audit generated. Upload spreadsheet data for enhanced analysis."
      );
    } catch (error) {
      console.error("Failed to generate audit:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate audit");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold">AI Profit Audit</h2>
          <Button
            onClick={generateAudit}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Data...
              </>
            ) : (
              "Generate AI Analysis"
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Get AI-powered insights based on your website and financial data.
          For comprehensive analysis, consider uploading financial spreadsheets.
        </p>
      </div>

      <div className="border-t pt-6">
        <LatestAuditReport />
      </div>
    </Card>
  );
}
