
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ShieldCheck } from "lucide-react";

export default function SecuritySettings() {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [isMfaEnabled, setIsMfaEnabled] = useState(settings?.two_factor_enabled ?? false);
  const [isExportingData, setIsExportingData] = useState(false);

  const handleMfaToggle = async () => {
    try {
      if (!isMfaEnabled) {
        // Start MFA enrollment process
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: 'totp'
        });
        
        if (error) throw error;
        
        // Show QR code to user (you'd typically show this in a modal)
        console.log('MFA QR Code URI:', data.totp.qr_code);
        
        // Update settings after successful enrollment
        await updateSettings({
          two_factor_enabled: true
        });
      } else {
        // Disable MFA
        const { error } = await supabase.auth.mfa.unenroll();
        if (error) throw error;
        
        await updateSettings({
          two_factor_enabled: false
        });
      }
      
      setIsMfaEnabled(!isMfaEnabled);
      toast.success(`Two-factor authentication ${!isMfaEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('MFA toggle error:', error);
      toast.error('Failed to update two-factor authentication');
    }
  };

  const handleDataExport = async () => {
    try {
      setIsExportingData(true);
      
      // Fetch user's data from all relevant tables
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [
        { data: transactions },
        { data: audits },
        { data: chatHistory },
        { data: integrations }
      ] = await Promise.all([
        supabase.from('financial_transactions').select('*').eq('user_id', user.id),
        supabase.from('financial_audits').select('*').eq('user_id', user.id),
        supabase.from('chat_history').select('*').eq('user_id', user.id),
        supabase.from('financial_integrations').select('*').eq('user_id', user.id)
      ]);

      // Prepare export data
      const exportData = {
        transactions,
        audits,
        chatHistory,
        integrations,
        exportDate: new Date().toISOString(),
        userId: user.id
      };

      // Create and download export file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Data export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExportingData(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Security Settings</h2>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
          </div>
          <Switch
            checked={isMfaEnabled}
            onCheckedChange={handleMfaToggle}
            disabled={isUpdating}
          />
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Two-factor authentication adds an extra layer of security to your account.
            We recommend enabling this feature.
          </AlertDescription>
        </Alert>

        <div className="pt-4">
          <h3 className="font-medium mb-2">Data Privacy</h3>
          <Button
            variant="outline"
            onClick={handleDataExport}
            disabled={isExportingData}
            className="w-full sm:w-auto"
          >
            <ShieldCheck className="w-4 h-4 mr-2" />
            {isExportingData ? 'Exporting...' : 'Export My Data'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
