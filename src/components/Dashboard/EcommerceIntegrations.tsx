
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EcommercePlatform } from "@/types/financial";

export default function EcommerceIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<EcommercePlatform | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform || !storeUrl) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('ecommerce_integrations').insert({
        platform,
        store_url: storeUrl,
        store_name: storeName || null,
        credentials: {
          api_key: apiKey,
          api_secret: apiSecret,
        },
        user_id: user.id,
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${platform}`);
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

        <div className="space-y-2">
          <Label htmlFor="storeUrl">Store URL</Label>
          <Input
            id="storeUrl"
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://your-store.myshopify.com"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name (Optional)</Label>
          <Input
            id="storeName"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Your Store Name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter API key"
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
            placeholder="Enter API secret"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect Platform"}
        </Button>
      </form>
    </Card>
  );
}
