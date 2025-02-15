
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

type CRMPlatform = 'salesforce' | 'hubspot' | 'zoho' | 'dynamics365' | 'pipedrive' | 'gohighlevel';

const PLATFORMS_REQUIRING_URL: CRMPlatform[] = ['salesforce', 'zoho', 'dynamics365'];

export default function CRMIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<CRMPlatform | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!platform) {
      toast.error("Please select a CRM platform");
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const credentials: Record<string, string> = {
        api_key: apiKey,
        api_secret: apiSecret,
      };

      // Only include instance_url if the platform requires it
      if (PLATFORMS_REQUIRING_URL.includes(platform)) {
        credentials.instance_url = instanceUrl;
      }

      const { error } = await supabase.from('crm_integrations').insert({
        platform,
        credentials,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${platform}`);
      setPlatform(null);
      setApiKey('');
      setApiSecret('');
      setInstanceUrl('');
    } catch (error) {
      toast.error("Failed to connect integration");
      console.error("Integration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInstanceUrlPlaceholder = (platform: CRMPlatform) => {
    switch (platform) {
      case 'salesforce':
        return 'https://your-instance.my.salesforce.com';
      case 'zoho':
        return 'https://www.zohoapis.com';
      case 'dynamics365':
        return 'https://your-org.crm.dynamics.com';
      default:
        return 'https://your-instance.crm.com';
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Connect CRM Platform</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="platform">Select Platform</Label>
          <Select
            value={platform || ""}
            onValueChange={(value) => setPlatform(value as CRMPlatform)}
          >
            <SelectTrigger id="platform">
              <SelectValue placeholder="Select CRM platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="salesforce">Salesforce</SelectItem>
              <SelectItem value="hubspot">HubSpot CRM</SelectItem>
              <SelectItem value="zoho">Zoho CRM</SelectItem>
              <SelectItem value="dynamics365">Microsoft Dynamics 365</SelectItem>
              <SelectItem value="pipedrive">Pipedrive</SelectItem>
              <SelectItem value="gohighlevel">GoHighLevel</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {platform && PLATFORMS_REQUIRING_URL.includes(platform) && (
          <div className="space-y-2">
            <Label htmlFor="instanceUrl">Instance URL</Label>
            <Input
              id="instanceUrl"
              type="url"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder={platform ? getInstanceUrlPlaceholder(platform) : ""}
              required
            />
          </div>
        )}

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
          {isLoading ? "Connecting..." : "Connect Integration"}
        </Button>
      </form>
    </Card>
  );
}
