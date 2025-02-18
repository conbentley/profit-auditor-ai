
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
      if (!user) {
        console.error('No authenticated user found');
        throw new Error("Not authenticated");
      }
      console.log('Authenticated user:', user.id);

      // Clear existing audit data first
      const { error: deleteError } = await supabase
        .from('financial_audits')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Error clearing existing audits:', deleteError);
        throw deleteError;
      }
      console.log('Cleared existing audit data');

      // Get all uploaded spreadsheets with detailed info
      const { data: spreadsheets, error: spreadsheetsError } = await supabase
        .from('spreadsheet_uploads')
        .select('*')
        .eq('user_id', user.id);

      if (spreadsheetsError) {
        console.error('Error fetching spreadsheets:', spreadsheetsError);
        throw spreadsheetsError;
      }

      console.log('Found spreadsheets:', {
        count: spreadsheets?.length || 0,
        details: spreadsheets?.map(s => ({
          id: s.id,
          filename: s.filename,
          processed: s.processed,
          uploaded_at: s.uploaded_at
        }))
      });

      if (!spreadsheets || spreadsheets.length === 0) {
        throw new Error("No spreadsheets found. Please upload your data first.");
      }

      // Check storage bucket for files
      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from('spreadsheets')
        .list(user.id + '/');

      console.log('Storage files:', {
        count: storageFiles?.length || 0,
        files: storageFiles
      });

      if (storageError) {
        console.error('Error checking storage:', storageError);
      }

      // Invalidate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit'] });

      const currentDate = new Date();
      const auditParams = {
        user_id: user.id,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        spreadsheets_count: spreadsheets.length
      };
      console.log('Generating audit with params:', auditParams);

      const response = await supabase.functions.invoke('generate-audit', {
        body: {
          ...auditParams,
          process_spreadsheets: true,
        },
      });

      console.log('Edge function response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        throw response.error;
      }

      // Mark spreadsheets as processed
      const { error: updateError } = await supabase
        .from('spreadsheet_uploads')
        .update({ processed: true })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating spreadsheet status:', updateError);
      } else {
        console.log('Successfully marked spreadsheets as processed');
      }

      // Invalidate queries again after new data is generated
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit'] });

      toast.success("Audit report generated successfully");
    } catch (error) {
      console.error("Failed to generate audit:", error);
      toast.error(
        error instanceof Error 
          ? `Failed to generate audit: ${error.message}`
          : "Failed to generate audit report"
      );
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
                Generating...
              </>
            ) : (
              "Generate New AI Profit Audit"
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate an AI-powered audit of your financial performance to get insights and recommendations.
        </p>
      </div>

      <div className="border-t pt-6">
        <LatestAuditReport />
      </div>
    </Card>
  );
}
