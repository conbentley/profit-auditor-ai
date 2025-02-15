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
import { EcommercePlatform, EcommerceIntegration } from "@/types/financial";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function EcommerceIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [platform, setPlatform] = useState<EcommercePlatform | null>(null);
  const [storeUrl, setStoreUrl] = useState('');
  const [storeName, setStoreName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const queryClient = useQueryClient();

  const { data: integrations } = useQuery({
    queryKey: ['ecommerce-integrations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('ecommerce_integrations')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as unknown as EcommerceIntegration[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('ecommerce_integrations')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-integrations'] });
      toast.success('Integration status updated');
    },
    onError: () => {
      toast.error('Failed to update integration status');
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ecommerce_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-integrations'] });
      toast.success('Integration deleted');
    },
    onError: () => {
      toast.error('Failed to delete integration');
    },
  });

  const triggerSync = useMutation({
    mutationFn: async (integration: EcommerceIntegration) => {
      const response = await fetch('/api/sync-ecommerce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_id: integration.id }),
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-integrations'] });
      toast.success('Sync triggered successfully');
    },
    onError: () => {
      toast.error('Failed to trigger sync');
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['ecommerce-integrations'] });
    } catch (error) {
      toast.error("Failed to connect integration");
      console.error("Integration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSyncStatus = (integration: EcommerceIntegration) => {
    const status = integration.last_sync_status?.status || 'pending';
    const colorMap: Record<string, string> = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      pending: 'bg-yellow-500',
      syncing: 'bg-blue-500',
    };

    return (
      <Badge className={colorMap[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">E-commerce Integrations</h2>
        
        {integrations && integrations.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Platform</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Sync</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrations.map((integration) => (
                <TableRow key={integration.id}>
                  <TableCell className="font-medium">
                    {integration.platform}
                  </TableCell>
                  <TableCell>
                    {integration.store_name || integration.store_url}
                  </TableCell>
                  <TableCell>{getSyncStatus(integration)}</TableCell>
                  <TableCell>
                    {integration.last_sync_at 
                      ? new Date(integration.last_sync_at).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={integration.is_active}
                      onCheckedChange={(checked) => 
                        toggleStatus.mutate({ id: integration.id, isActive: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => triggerSync.mutate(integration)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Integration Settings</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Store URL</Label>
                              <div className="mt-1">
                                {integration.store_url}
                              </div>
                            </div>
                            <div>
                              <Label>Connection Status</Label>
                              <div className="mt-1">
                                {getSyncStatus(integration)}
                              </div>
                            </div>
                            <div>
                              <Label>Last Sync</Label>
                              <div className="mt-1">
                                {integration.last_sync_at 
                                  ? new Date(integration.last_sync_at).toLocaleString()
                                  : 'Never'}
                              </div>
                            </div>
                            {integration.last_sync_status?.message && (
                              <div>
                                <Label>Last Sync Message</Label>
                                <div className="mt-1 text-sm text-gray-500">
                                  {integration.last_sync_status.message}
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this integration?')) {
                            deleteIntegration.mutate(integration.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Add New Integration</h3>
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
        </div>
      </div>
    </Card>
  );
}
