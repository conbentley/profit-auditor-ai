
import { useState } from "react";
import { Globe, ArrowRight } from "lucide-react";
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

const WebsiteIntegrations = () => {
  const [url, setUrl] = useState("");
  const [websiteType, setWebsiteType] = useState("");
  const [autoScan, setAutoScan] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

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

      // Call the website scanning edge function
      const { data, error } = await supabase.functions.invoke('analyze-website', {
        body: {
          url,
          websiteType,
          autoScan,
          userId: user.id
        }
      });

      if (error) throw error;

      toast.success("Website successfully integrated!");
      // Handle the response data as needed
      console.log("Website analysis results:", data);

    } catch (error) {
      console.error("Error integrating website:", error);
      toast.error("Failed to integrate website. Please try again.");
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
