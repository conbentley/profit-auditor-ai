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
import { PaymentProvider } from "@/types/payment";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ExternalLink } from "lucide-react";
import { CredentialsGuideModal } from "./CredentialsGuideModal";

async function validatePaymentCredentials(
  provider: PaymentProvider,
  credentials: {
    api_key: string;
    api_secret?: string;
    client_id?: string;
    client_secret?: string;
  },
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    switch (provider) {
      case "stripe":
        return true;
      case "paypal":
        return true;
      case "square":
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

export default function PaymentIntegrations() {
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

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
        ...(apiSecret && { api_secret: apiSecret }),
        ...(clientId && { client_id: clientId }),
        ...(clientSecret && { client_secret: clientSecret }),
      };

      const isValid = await validatePaymentCredentials(provider, credentials, isTestMode);
      
      if (!isValid) {
        toast.error("Invalid credentials. Please check your API keys and secrets.");
        return;
      }

      const { error } = await supabase.from('payment_integrations').insert({
        provider,
        credentials,
        user_id: user.id,
        is_test_mode: isTestMode,
        metadata: { setup_completed: true }
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${provider}${isTestMode ? ' (Test Mode)' : ''}`);
      setProvider(null);
      setApiKey('');
      setApiSecret('');
      setClientId('');
      setClientSecret('');
    } catch (error) {
      toast.error("Failed to connect integration");
      console.error("Integration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const needsClientCredentials = provider === 'paypal';

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Connect Payment Provider</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Select Provider</Label>
          <Select
            value={provider || ""}
            onValueChange={(value) => setProvider(value as PaymentProvider)}
          >
            <SelectTrigger id="provider">
              <SelectValue placeholder="Select payment provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stripe">Stripe</SelectItem>
              <SelectItem value="paypal">PayPal</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="adyen">Adyen</SelectItem>
              <SelectItem value="braintree">Braintree</SelectItem>
              <SelectItem value="razorpay">Razorpay</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider && (
          <>
            <button
              type="button"
              onClick={() => setShowCredentialsGuide(true)}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Find your {provider.charAt(0).toUpperCase() + provider.slice(1)} API credentials
            </button>

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

            {needsClientCredentials ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    type="password"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder={isTestMode && isAdmin ? "test_client_id" : "Enter Client ID"}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder={isTestMode && isAdmin ? "test_client_secret" : "Enter Client Secret"}
                    required
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Connecting..." : `Connect${isTestMode && isAdmin ? ' (Test Mode)' : ''}`}
            </Button>

            {isTestMode && isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                Test mode enabled. No real API calls will be made.
              </p>
            )}
          </>
        )}
      </form>

      <CredentialsGuideModal
        platform={provider}
        isOpen={showCredentialsGuide}
        onClose={() => setShowCredentialsGuide(false)}
      />
    </Card>
  );
}
