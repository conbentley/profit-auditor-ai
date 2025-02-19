
import { useState, useEffect } from "react";
import { Globe, ArrowRight, RefreshCw, ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Json } from "@/integrations/supabase/types";

interface WebsiteAnalysis {
  id: string;
  url: string;
  website_type: 'ecommerce' | 'service' | 'b2b' | 'other';
  auto_scan: boolean;
  ai_analysis: string | null;
  last_scanned: string;
  seo_metrics: Record<string, any>;
  competitor_data?: Record<string, any>;
  raw_scan_data?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

const WebsiteIntegrations = () => {
  const [url, setUrl] = useState("");
  const [websiteType, setWebsiteType] = useState("");
  const [autoScan, setAutoScan] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [analyses, setAnalyses] = useState<WebsiteAnalysis[]>([]);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('website_analysis')
        .select('*')
        .order('last_scanned', { ascending: false });

      if (error) throw error;

      // Transform the data to ensure correct types
      const transformedData: WebsiteAnalysis[] = (data || []).map(item => ({
        ...item,
        seo_metrics: typeof item.seo_metrics === 'string' 
          ? JSON.parse(item.seo_metrics) 
          : item.seo_metrics || {},
        competitor_data: typeof item.competitor_data === 'string'
          ? JSON.parse(item.competitor_data)
          : item.competitor_data || {},
        raw_scan_data: typeof item.raw_scan_data === 'string'
          ? JSON.parse(item.raw_scan_data)
          : item.raw_scan_data || {},
      }));

      setAnalyses(transformedData);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      toast.error("Failed to load website analyses");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast.error("Please enter a website URL");
      return;
    }

    try {
      setIsScanning(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to integrate your website");
        return;
      }

      toast.info("Starting website analysis...");

      // Prepare the request payload
      const payload = {
        url,
        websiteType,
        autoScan,
        userId: user.id
      };

      console.log('Sending analysis request with payload:', payload);

      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: payload
      });

      console.log('Received response:', data);

      if (error) {
        console.error('Analysis error:', error);
        throw error;
      }

      toast.success("Website successfully analyzed!");
      await fetchAnalyses();
      
      // Reset form
      setUrl("");
      setWebsiteType("");
      
    } catch (error) {
      console.error("Error analyzing website:", error);
      toast.error("Failed to analyze website. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRescan = async (analysis: WebsiteAnalysis) => {
    try {
      setIsScanning(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to rescan website");
        return;
      }

      toast.info("Starting website rescan...");

      // Prepare the request payload
      const payload = {
        url: analysis.url,
        websiteType: analysis.website_type,
        autoScan: analysis.auto_scan,
        userId: user.id
      };

      console.log('Sending rescan request with payload:', payload);

      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: payload
      });

      console.log('Received rescan response:', data);

      if (error) {
        console.error('Rescan error:', error);
        throw error;
      }

      toast.success("Website successfully rescanned!");
      await fetchAnalyses();
      
    } catch (error) {
      console.error("Error rescanning website:", error);
      toast.error("Failed to rescan website. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 p-2">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Website Integration</h3>
          <p className="text-sm text-muted-foreground">
            Connect your website to enable AI-powered business analysis and insights
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="website-url">Website URL</Label>
            <Input
              id="website-url"
              placeholder="https://your-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-type">Website Type</Label>
            <Select value={websiteType} onValueChange={setWebsiteType}>
              <SelectTrigger id="website-type">
                <SelectValue placeholder="Select website type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="service">Service Business</SelectItem>
                <SelectItem value="b2b">B2B</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-scan">Enable Auto-Scanning</Label>
              <p className="text-sm text-muted-foreground">
                Automatically scan website for changes
              </p>
            </div>
            <Switch
              id="auto-scan"
              checked={autoScan}
              onCheckedChange={setAutoScan}
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={isScanning}
        >
          {isScanning ? (
            "Scanning Website..."
          ) : (
            <>
              Connect Website
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {analyses.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-medium mb-4">Connected Websites</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Website</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Scanned</TableHead>
                <TableHead>Auto-Scan</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analyses.map((analysis) => (
                <TableRow key={analysis.id}>
                  <TableCell>
                    <a 
                      href={analysis.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:underline"
                    >
                      {analysis.url}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell className="capitalize">{analysis.website_type}</TableCell>
                  <TableCell>{format(new Date(analysis.last_scanned), 'MMM d, yyyy HH:mm')}</TableCell>
                  <TableCell>{analysis.auto_scan ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRescan(analysis)}
                      disabled={isScanning}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      Rescan
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="mb-2 text-sm font-medium">What happens next?</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Our AI will scan your website to understand your business</li>
          <li>• Analyze product offerings, services, and pricing</li>
          <li>• Generate insights by combining with your financial data</li>
          <li>• Provide personalized recommendations for improvement</li>
        </ul>
      </div>
    </div>
  );
};

export default WebsiteIntegrations;
