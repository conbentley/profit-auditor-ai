
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
      if (!user) throw new Error("Please sign in to generate an audit");

      // Clear existing audit
      await supabase
        .from('financial_audits')
        .delete()
        .eq('user_id', user.id);

      // Generate new audit
      const response = await supabase.functions.invoke('generate-audit', {
        body: { user_id: user.id }
      });

      if (response.error) throw response.error;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit'] });

      toast.success("Audit report generated successfully");
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
          Get AI-powered insights and recommendations based on your financial data.
        </p>
      </div>

      <div className="border-t pt-6">
        <LatestAuditReport />
      </div>
    </Card>
  );
}
