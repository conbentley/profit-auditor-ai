
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

export default function MarketplaceIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<MarketplacePlatform | null>(null);
  const [region, setRegion] = useState<string>('');
  const [sellerId, setSellerId] = useState('');
  const [marketplaceId, setMarketplaceId] = useState('');
  const [syncInventory, setSyncInventory] = useState(true);
  const [syncPricing, setSyncPricing] = useState(true);
  const [syncOrders, setSyncOrders] = useState(true);

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

      toast.success(`Successfully connected to ${platform}`);
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
            placeholder={`Enter your ${platform || 'marketplace'} Seller ID`}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="marketplaceId">Marketplace ID</Label>
          <Input
            id="marketplaceId"
            value={marketplaceId}
            onChange={(e) => setMarketplaceId(e.target.value)}
            placeholder={`Enter your ${platform || 'marketplace'} ID`}
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
          {isLoading ? "Connecting..." : "Connect Integration"}
        </Button>
      </form>
    </Card>
  );
}
