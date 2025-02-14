
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
import { AccountingProvider } from "@/types/financial";

export default function FinancialIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AccountingProvider | ''>('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('financial_integrations').insert({
        provider,
        credentials: {
          api_key: apiKey,
          api_secret: apiSecret,
        },
        user_id: user.id,
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${provider}`);
      setProvider('');
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
            value={provider}
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
