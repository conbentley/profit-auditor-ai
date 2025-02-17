
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LatestAuditReport } from "./LatestAuditReport";

export default function AuditReport() {
  const [isLoading, setIsLoading] = useState(false);

  const generateAudit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentDate = new Date();
      console.log('Generating audit for:', {
        user_id: user.id,
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
      });

      const response = await supabase.functions.invoke('generate-audit', {
        body: {
          user_id: user.id,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        },
      });

      console.log('Edge function response:', response);

      if (response.error) {
        console.error('Edge function error:', response.error);
        throw response.error;
      }

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
