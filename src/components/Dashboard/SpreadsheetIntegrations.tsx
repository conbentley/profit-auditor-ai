
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";

export default function SpreadsheetIntegrations() {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid Excel or CSV file");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await supabase.functions.invoke('upload-spreadsheet', {
        body: formData,
      });

      if (response.error) throw response.error;

      toast.success("Spreadsheet uploaded successfully");
      event.target.value = ''; // Reset file input
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload spreadsheet");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Upload Spreadsheet</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="spreadsheet">Select Excel or CSV file</Label>
          <div className="flex items-center gap-4">
            <input
              id="spreadsheet"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              onClick={() => document.getElementById('spreadsheet')?.click()}
              disabled={isUploading}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "Uploading..." : "Upload Spreadsheet"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
        </p>
      </div>
    </Card>
  );
}
