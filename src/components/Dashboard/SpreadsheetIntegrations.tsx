
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface SpreadsheetUpload {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
  processed: boolean;
  processing_error: string | null;
  row_count: number;
  analysis_results: {
    insights: Array<{
      type: string;
      column: string;
      message: string;
      statistics?: {
        min: number;
        max: number;
        average: number;
        total: number;
      };
    }>;
    columns: string[];
    statistics: Record<string, any>;
  };
  analyzed_at: string | null;
}

export default function SpreadsheetIntegrations() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<SpreadsheetUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const { data, error } = await supabase
        .from('spreadsheet_uploads')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      toast.error("Failed to load spreadsheet uploads");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
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

      toast.success("Spreadsheet uploaded and analyzed successfully");
      event.target.value = '';
      fetchUploads(); // Refresh the list after upload
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload spreadsheet");
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  };

  const toggleRowExpansion = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const renderAnalysisDetails = (upload: SpreadsheetUpload) => {
    if (!upload.analysis_results || !upload.processed) return null;

    return (
      <div className="p-4 bg-muted/50 rounded-md space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <h4 className="font-medium text-sm">Rows</h4>
            <p className="text-sm text-muted-foreground">{upload.row_count}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Columns</h4>
            <p className="text-sm text-muted-foreground">{upload.analysis_results.columns.length}</p>
          </div>
          <div>
            <h4 className="font-medium text-sm">Analyzed At</h4>
            <p className="text-sm text-muted-foreground">{upload.analyzed_at ? formatDate(upload.analyzed_at) : 'N/A'}</p>
          </div>
        </div>

        {upload.analysis_results.insights.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Key Insights</h4>
            <div className="space-y-2">
              {upload.analysis_results.insights.map((insight, index) => (
                <div key={index} className="text-sm p-2 bg-background rounded border">
                  <p>{insight.message}</p>
                  {insight.statistics && (
                    <div className="mt-2 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div>Min: {insight.statistics.min}</div>
                      <div>Max: {insight.statistics.max}</div>
                      <div>Avg: {insight.statistics.average.toFixed(2)}</div>
                      <div>Total: {insight.statistics.total}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
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

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Uploaded Spreadsheets</h2>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : uploads.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No spreadsheets uploaded yet
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <>
                  <TableRow key={upload.id} className="cursor-pointer" onClick={() => toggleRowExpansion(upload.id)}>
                    <TableCell>
                      {expandedRows[upload.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getFileTypeIcon(upload.file_type)}
                      </div>
                    </TableCell>
                    <TableCell>{upload.filename}</TableCell>
                    <TableCell>{formatDate(upload.uploaded_at)}</TableCell>
                    <TableCell>
                      {upload.processing_error ? (
                        <span className="text-red-500">Error</span>
                      ) : upload.processed ? (
                        <span className="text-green-500">Analyzed</span>
                      ) : (
                        <span className="text-yellow-500">Processing</span>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows[upload.id] && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        {renderAnalysisDetails(upload)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
