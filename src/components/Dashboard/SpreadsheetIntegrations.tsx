
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface SpreadsheetUpload {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
  processed: boolean;
  processing_error: string | null;
}

export default function SpreadsheetIntegrations() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploads, setUploads] = useState<SpreadsheetUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('spreadsheet_uploads')
        .select('id, filename, file_type, uploaded_at, processed, processing_error')
        .eq('user_id', user.id)
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
      // Create FormData object
      const formData = new FormData();
      formData.append('file', file);

      // Upload file
      const response = await supabase.functions.invoke('upload-spreadsheet', {
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Upload response:', response);

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      toast.success("Spreadsheet uploaded successfully");
      event.target.value = '';
      await fetchUploads();
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload spreadsheet: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Optimistically remove from UI
      setUploads(current => current.filter(upload => upload.id !== id));
      
      const { error } = await supabase
        .from('spreadsheet_uploads')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Ensure user can only delete their own uploads

      if (error) {
        // If deletion fails, restore the item
        await fetchUploads();
        throw error;
      }

      toast.success("Spreadsheet deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete spreadsheet");
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
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
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Spreadsheet
                  </>
                )}
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
                <TableHead>Type</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
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
                      <span className="text-green-500">Analysis Complete</span>
                    ) : (
                      <span className="text-yellow-500">Pending Analysis</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog open={deleteId === upload.id} onOpenChange={(open) => !open && setDeleteId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(upload.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Spreadsheet</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this spreadsheet? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(upload.id)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
