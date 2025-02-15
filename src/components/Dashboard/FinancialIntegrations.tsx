
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
import { Upload } from "lucide-react";

export default function FinancialIntegrations() {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<AccountingProvider | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check if file is an allowed type
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("Please upload an Excel or CSV file");
        return;
      }
      
      setFile(selectedFile);
    }
  };

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

      let documents = [];

      if (file) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('financial_documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        if (uploadData) {
          documents.push({
            name: file.name,
            path: fileName,
            type: file.type,
            size: file.size,
            uploaded_at: new Date().toISOString()
          });
        }
      }

      const { error } = await supabase.from('financial_integrations').insert({
        provider,
        credentials: {
          api_key: apiKey,
          api_secret: apiSecret,
        },
        documents,
        user_id: user.id,
      });

      if (error) throw error;

      toast.success(`Successfully connected to ${provider}`);
      setProvider(null);
      setApiKey('');
      setApiSecret('');
      setFile(null);
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

        <div className="space-y-2">
          <Label htmlFor="file">Upload Spreadsheet (Optional)</Label>
          <div className="flex items-center gap-4 h-10 border rounded-md px-3">
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 border-0 p-0"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-gray-500 whitespace-nowrap">
                <Upload className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Supported formats: Excel (.xlsx, .xls) and CSV
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Connecting..." : "Connect Integration"}
        </Button>
      </form>
    </Card>
  );
}
