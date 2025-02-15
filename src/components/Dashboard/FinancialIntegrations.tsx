import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AccountingProvider } from "@/types/financial";
import { useIsAdmin } from "@/hooks/useIsAdmin";

async function validateFinancialCredentials(
  provider: AccountingProvider,
  credentials: {
    api_key: string;
    api_secret: string;
  },
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    // Implement real validation for each provider
    switch (provider) {
      case "xero":
        // TODO: Implement Xero validation
        return true;
      case "quickbooks":
        // TODO: Implement QuickBooks validation
        return true;
      case "sage":
        // TODO: Implement Sage validation
        return true;
      default:
        console.warn(`No validation implemented for ${provider}`);
        return true;
    }
  } catch (error) {
    console.error(`Error validating ${provider} credentials:`, error);
    return false;
  }
}

export default function FinancialIntegrations() {
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AccountingProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider) {
      toast.error("Please select a provider");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const credentials = {
        api_key: apiKey,
        api_secret: apiSecret,
      };

      const isValid = await validateFinancialCredentials(provider, credentials, isTestMode);
      
      if (!isValid) {
        toast.error("Invalid credentials. Please check your API key and secret.");
        return;
      }

      const { error } = await supabase.from('financial_integrations').insert({
        provider,
        credentials,
        user_id: user.id,
        metadata: { is_test_mode: isTestMode }
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${provider}${isTestMode ? ' (Test Mode)' : ''}`);
      setProvider(null);
      setApiKey('');
      setApiSecret('');
    } catch (error) {
      toast.error("Failed to connect integration");
      console.error("Integration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Connect Accounting Software</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Select Provider</Label>
          <Select
            value={provider || ""}
            onValueChange={(value) => setProvider(value as AccountingProvider)}
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select accounting software" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="xero">Xero</SelectItem>
              <SelectItem value="quickbooks">QuickBooks</SelectItem>
              <SelectItem value="sage">Sage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Switch
              id="test-mode"
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
            />
            <Label htmlFor="test-mode">Test Mode</Label>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isTestMode && isAdmin ? "test_api_key" : "Enter API key"}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiSecret">API Secret</Label>
          <Input
            id="apiSecret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder={isTestMode && isAdmin ? "test_api_secret" : "Enter API secret"}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Connecting..." : `Connect${isTestMode && isAdmin ? ' (Test Mode)' : ''}`}
        </Button>

        {isTestMode && isAdmin && (
          <p className="text-sm text-muted-foreground mt-2">
            Test mode enabled. No real API calls will be made.
          </p>
        )}
      </form>
    </Card>
  );
}
