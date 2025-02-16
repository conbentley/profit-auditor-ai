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
import { ExternalLink } from "lucide-react";

type MarketplacePlatform = 'amazon' | 'ebay' | 'etsy';

const REGIONS = {
  amazon: [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'de', label: 'Germany' },
  ],
  ebay: [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'de', label: 'Germany' },
    { value: 'au', label: 'Australia' },
  ],
  etsy: [
    { value: 'global', label: 'Global' }, // Etsy operates globally with a single marketplace
  ],
};

async function validateMarketplaceCredentials(
  platform: MarketplacePlatform,
  sellerId: string,
  marketplaceId: string,
  region: string,
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    // Implement real validation for each platform
    switch (platform) {
      case 'amazon':
        // TODO: Implement Amazon validation
        return true;
      case 'ebay':
        // TODO: Implement eBay validation
        return true;
      case 'etsy':
        // TODO: Implement Etsy validation
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

export default function MarketplaceIntegrations() {
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<MarketplacePlatform | null>(null);
  const [region, setRegion] = useState<string>('');
  const [sellerId, setSellerId] = useState('');
  const [marketplaceId, setMarketplaceId] = useState('');
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncPricing, setSyncPricing] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);
  const [isTestMode, setIsTestMode] = useState(false);

  const getApiDocsLink = (platform: MarketplacePlatform | null) => {
    switch (platform) {
      case 'amazon':
        return 'https://developer-docs.amazon.com/sp-api/docs/creating-and-configuring-iam-policies';
      case 'ebay':
        return 'https://developer.ebay.com/api-docs/static/oauth-credentials.html';
      case 'etsy':
        return 'https://developers.etsy.com/documentation/essentials/authentication#api-key';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !region) {
      toast.error("Please select a platform and region");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const isValid = await validateMarketplaceCredentials(
        platform,
        sellerId,
        marketplaceId,
        region,
        isTestMode
      );
      
      if (!isValid) {
        toast.error("Invalid credentials. Please check your seller ID and marketplace ID.");
        return;
      }

      // First create the ecommerce integration
      const { data: integration, error: integrationError } = await supabase
        .from('ecommerce_integrations')
        .insert({
          platform,
          store_url: platform === 'amazon' 
            ? 'amazon.com' 
            : platform === 'ebay' 
              ? 'ebay.com' 
              : 'etsy.com',
          store_name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Store`,
          credentials: {},
          user_id: user.id,
          metadata: { is_test_mode: isTestMode }
        })
        .select()
        .single();

      if (integrationError) throw integrationError;

      // Then create the marketplace settings
      const { error: settingsError } = await supabase
        .from('marketplace_settings')
        .insert({
          user_id: user.id,
          integration_id: integration.id,
          marketplace_id: marketplaceId,
          seller_id: sellerId,
          region,
          sync_inventory: syncInventory,
          sync_pricing: syncPricing,
          sync_orders: syncOrders,
          settings: {},
        });

      if (settingsError) throw settingsError;

      toast.success(`Successfully connected to ${platform}${isTestMode ? ' (Test Mode)' : ''}`);
      setPlatform(null);
      setRegion('');
      setSellerId('');
      setMarketplaceId('');
    } catch (error) {
      toast.error("Failed to connect integration");
      console.error("Integration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Connect Marketplace</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Select Platform</Label>
          <Select
            value={platform || ""}
            onValueChange={(value) => setPlatform(value as MarketplacePlatform)}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select marketplace platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amazon">Amazon</SelectItem>
              <SelectItem value="ebay">eBay</SelectItem>
              <SelectItem value="etsy">Etsy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {platform && (
          <a 
            href={getApiDocsLink(platform)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Find your {platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials
          </a>
        )}

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

        {platform && (
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger id="region">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {REGIONS[platform].map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sellerId">Seller ID</Label>
          <Input
            id="sellerId"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
            placeholder={isTestMode && isAdmin ? "test_seller_123" : `Enter your ${platform || 'marketplace'} Seller ID`}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketplaceId">Marketplace ID</Label>
          <Input
            id="marketplaceId"
            value={marketplaceId}
            onChange={(e) => setMarketplaceId(e.target.value)}
            placeholder={isTestMode && isAdmin ? "test_marketplace_123" : `Enter your ${platform || 'marketplace'} ID`}
            required
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Sync Settings</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="syncInventory">Sync Inventory</Label>
              <Switch
                id="syncInventory"
                checked={syncInventory}
                onCheckedChange={setSyncInventory}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="syncPricing">Sync Pricing</Label>
              <Switch
                id="syncPricing"
                checked={syncPricing}
                onCheckedChange={setSyncPricing}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="syncOrders">Sync Orders</Label>
              <Switch
                id="syncOrders"
                checked={syncOrders}
                onCheckedChange={setSyncOrders}
              />
            </div>
          </div>
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
