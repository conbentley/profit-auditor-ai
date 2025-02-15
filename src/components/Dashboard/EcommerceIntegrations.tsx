
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
import { useIsAdmin } from "@/hooks/useIsAdmin";

type EcommercePlatform = 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'prestashop';

async function validateEcommerceCredentials(
  platform: EcommercePlatform,
  credentials: {
    api_key: string;
    api_secret: string;
  },
  storeUrl: string,
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    // Implement real validation for each platform
    switch (platform) {
      case 'shopify':
        // TODO: Implement Shopify validation
        return true;
      case 'woocommerce':
        // TODO: Implement WooCommerce validation
        return true;
      default:
        console.warn(`No validation implemented for ${platform}`);
        return true;
    }
  } catch (error) {
    console.error(`Error validating ${platform} credentials:`, error);
    return false;
  }
}

export default function EcommerceIntegrations() {
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<EcommercePlatform | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform) {
      toast.error("Please select a platform");
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

      const isValid = await validateEcommerceCredentials(
        platform,
        credentials,
        storeUrl,
        isTestMode
      );
      
      if (!isValid) {
        toast.error("Invalid credentials. Please check your API key and secret.");
        return;
      }

      const { error } = await supabase.from('ecommerce_integrations').insert({
        platform,
        store_url: storeUrl,
        store_name: storeName,
        credentials,
        user_id: user.id,
        metadata: { is_test_mode: isTestMode }
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${platform}${isTestMode ? ' (Test Mode)' : ''}`);
      setPlatform(null);
      setStoreUrl('');
      setStoreName('');
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
      <h2 className="text-lg font-semibold mb-4">Connect E-commerce Platform</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Select Platform</Label>
          <Select
            value={platform || ""}
            onValueChange={(value) => setPlatform(value as EcommercePlatform)}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select e-commerce platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shopify">Shopify</SelectItem>
              <SelectItem value="woocommerce">WooCommerce</SelectItem>
              <SelectItem value="magento">Magento</SelectItem>
              <SelectItem value="bigcommerce">BigCommerce</SelectItem>
              <SelectItem value="prestashop">PrestaShop</SelectItem>
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
          <Label htmlFor="storeName">Store Name</Label>
          <Input
            id="storeName"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder={isTestMode && isAdmin ? "Test Store" : "Enter store name"}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeUrl">Store URL</Label>
          <Input
            id="storeUrl"
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder={isTestMode && isAdmin ? "https://test-store.com" : "https://your-store.com"}
            required
          />
        </div>

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
