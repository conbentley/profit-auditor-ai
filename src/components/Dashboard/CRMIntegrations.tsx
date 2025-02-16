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
import { CredentialsGuideModal } from "./CredentialsGuideModal";

type CRMPlatform = 'salesforce' | 'hubspot' | 'zoho' | 'dynamics365' | 'pipedrive' | 'gohighlevel';

const PLATFORMS_REQUIRING_URL: CRMPlatform[] = ['salesforce', 'zoho', 'dynamics365'];

async function validateCredentials(
  platform: CRMPlatform, 
  credentials: { 
    api_key: string; 
    api_secret: string; 
    instance_url?: string;
  },
  isTestMode: boolean
): Promise<boolean> {
  if (isTestMode) {
    // In test mode, simulate API validation with a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
  }

  try {
    // In production, make actual API calls to validate credentials
    switch (platform) {
      case 'salesforce':
        // TODO: Implement Salesforce validation
        console.log('Validating Salesforce credentials...');
        return true;

      case 'hubspot':
        const hubspotRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/verify', {
          headers: { Authorization: `Bearer ${credentials.api_key}` }
        });
        return hubspotRes.ok;

      case 'zoho':
        const zohoRes = await fetch(`${credentials.instance_url}/crm/v2/users`, {
          headers: { 
            Authorization: `Zoho-oauthtoken ${credentials.api_key}`,
            'Content-Type': 'application/json'
          }
        });
        return zohoRes.ok;

      // Add other CRM validation logic here
      default:
        console.warn(`No validation implemented for ${platform}`);
        return true;
    }
  } catch (error) {
    console.error(`Error validating ${platform} credentials:`, error);
    return false;
  }
}

export default function CRMIntegrations() {
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<CRMPlatform | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [instanceUrl, setInstanceUrl] = useState('');
  const [isTestMode, setIsTestMode] = useState(false);
  const [showCredentialsGuide, setShowCredentialsGuide] = useState(false);

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

      const credentials = {
        api_key: apiKey,
        api_secret: apiSecret,
        ...(PLATFORMS_REQUIRING_URL.includes(platform) ? { instance_url: instanceUrl } : {})
      };

      // Validate credentials before saving
      const isValid = await validateCredentials(platform, credentials, isTestMode);
      
      if (!isValid) {
        toast.error("Invalid credentials. Please check your API key and secret.");
        return;
      }

      const { error } = await supabase.from('crm_integrations').insert({
        platform,
        credentials,
        user_id: user.id,
        metadata: { is_test_mode: isTestMode }
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${platform}${isTestMode ? ' (Test Mode)' : ''}`);
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

  const getApiDocsLink = (platform: CRMPlatform | null) => {
    switch (platform) {
      case 'salesforce':
        return 'https://help.salesforce.com/s/articleView?id=sf.connected_app_create_api_integration.htm';
      case 'hubspot':
        return 'https://developers.hubspot.com/docs/api/private-apps';
      case 'zoho':
        return 'https://www.zoho.com/crm/developer/docs/api/v3/auth-request.html';
      case 'dynamics365':
        return 'https://learn.microsoft.com/en-us/dynamics365/customer-engagement/developer/use-microsoft-dynamics-365-web-api';
      case 'pipedrive':
        return 'https://pipedrive.readme.io/docs/core-api-concepts-authentication';
      case 'gohighlevel':
        return 'https://highlevel.stoplight.io/docs/integrations/567080da885e8-authentication';
      default:
        return '';
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

        {platform && (
          <button
            type="button"
            onClick={() => setShowCredentialsGuide(true)}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Find your {platform.charAt(0).toUpperCase() + platform.slice(1)} API credentials
          </button>
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

        {PLATFORMS_REQUIRING_URL.includes(platform as CRMPlatform) && (
          <div className="space-y-2">
            <Label htmlFor="instanceUrl">Instance URL</Label>
            <Input
              id="instanceUrl"
              type="url"
              value={instanceUrl}
              onChange={(e) => setInstanceUrl(e.target.value)}
              placeholder={platform ? getInstanceUrlPlaceholder(platform as CRMPlatform) : ""}
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

      <CredentialsGuideModal
        platform={platform}
        isOpen={showCredentialsGuide}
        onClose={() => setShowCredentialsGuide(false)}
      />
    </Card>
  );
}
