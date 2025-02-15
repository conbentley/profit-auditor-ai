
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/useUserSettings";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import AuditLogViewer from "./AuditLogViewer";

interface MFAData {
  id: string;
  totp: {
    qr_code: string;
    secret: string;
  };
}

export default function SecuritySettings() {
  const { settings, updateSettings, isUpdating } = useUserSettings();
  const [isMfaEnabled, setIsMfaEnabled] = useState(settings?.two_factor_enabled ?? false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<MFAData | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const logSecurityEvent = async (
    eventType: 'mfa_enabled' | 'mfa_disabled' | 'data_exported',
    metadata: Record<string, any> = {}
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc('log_audit_event', {
      p_user_id: user.id,
      p_event_type: eventType,
      p_metadata: metadata,
      p_ip_address: null, // Could be obtained from a request if needed
      p_user_agent: navigator.userAgent
    });
  };

  const handleMfaToggle = async () => {
    try {
      if (!isMfaEnabled) {
        // Start MFA enrollment process
        const { data: factorData, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'AI Profit Auditor'
        });
        
        if (enrollError) throw enrollError;
        
        setMfaSecret(factorData as unknown as MFAData);
        setShowMfaDialog(true);
      } else {
        // Disable MFA
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors.totp[0];
        
        if (totpFactor) {
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({
            factorId: totpFactor.id
          });
          
          if (unenrollError) throw unenrollError;
        }
        
        await updateSettings({
          two_factor_enabled: false
        });

        await logSecurityEvent('mfa_disabled');
        
        setIsMfaEnabled(false);
        toast.success('Two-factor authentication disabled');
      }
    } catch (error) {
      console.error('MFA toggle error:', error);
      toast.error('Failed to update two-factor authentication');
    }
  };

  const verifyMfaCode = async () => {
    if (!mfaSecret || !verificationCode) return;

    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaSecret.id
      });
      
      if (challengeError) throw challengeError;
      setChallengeId(challengeData.id);

      if (!challengeData.id) {
        throw new Error('Failed to get challenge ID');
      }

      const { error: verifyCodeError } = await supabase.auth.mfa.verify({
        factorId: mfaSecret.id,
        challengeId: challengeData.id,
        code: verificationCode
      });

      if (verifyCodeError) throw verifyCodeError;

      await updateSettings({
        two_factor_enabled: true
      });

      await logSecurityEvent('mfa_enabled');

      setIsMfaEnabled(true);
      setShowMfaDialog(false);
      setMfaSecret(null);
      setVerificationCode("");
      setChallengeId(null);
      toast.success('Two-factor authentication enabled');
    } catch (error) {
      console.error('MFA verification error:', error);
      toast.error('Failed to verify MFA code');
    }
  };

  const handleDataExport = async () => {
    try {
      setIsExportingData(true);
      
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

      const exportData = {
        transactions,
        audits,
        chatHistory,
        integrations,
        exportDate: new Date().toISOString(),
        userId: user.id
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await logSecurityEvent('data_exported', {
        exportTime: new Date().toISOString(),
        dataTypes: ['transactions', 'audits', 'chatHistory', 'integrations']
      });

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Data export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExportingData(false);
    }
  };

  return (
    <>
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

      <div className="mt-6">
        <AuditLogViewer />
      </div>

      <Dialog open={showMfaDialog} onOpenChange={setShowMfaDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {mfaSecret && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <img
                    src={mfaSecret.totp.qr_code}
                    alt="QR Code for MFA"
                    className="w-48 h-48"
                  />
                </div>
                
                <Alert>
                  <KeyRound className="h-4 w-4" />
                  <AlertDescription>
                    Scan this QR code with your authenticator app (like Google Authenticator
                    or Authy), then enter the code below to enable 2FA.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <InputOTP
                    value={verificationCode}
                    onChange={setVerificationCode}
                    maxLength={6}
                    render={({ slots }) => (
                      <InputOTPGroup>
                        {slots.map((slot, i) => (
                          <InputOTPSlot key={i} {...slot} index={i} />
                        ))}
                      </InputOTPGroup>
                    )}
                  />
                </div>

                <Button
                  onClick={verifyMfaCode}
                  disabled={verificationCode.length !== 6}
                  className="w-full"
                >
                  Verify and Enable 2FA
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
