
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface SpreadsheetUpload {
  id: string;
  filename: string;
  file_type: string;
  file_path: string;
  uploaded_at: string | null;
  processed: boolean | null;
  processing_error: string | null;
  analysis_results?: any;
}

const SpreadsheetIntegrations = () => {
  const [uploads, setUploads] = useState<SpreadsheetUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<SpreadsheetUpload | null>(null);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("spreadsheet_uploads").select("*");
    if (error) {
      toast.error("Error fetching uploads");
    } else {
      setUploads(data);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("spreadsheet_uploads").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting upload");
    } else {
      toast.success("Upload deleted");
      fetchUploads();
    }
  };

  const processUpload = async (uploadId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-spreadsheet', {
        body: { uploadId }
      });

      if (error) throw error;
      
      toast.success('File processed successfully');
      fetchUploads();
    } catch (error: any) {
      toast.error(error.message || 'Error processing file');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setUploading(true);
    const uploadPromises = Array.from(uploadFiles).map(async (file) => {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
        throw new Error(`Invalid file type for ${file.name}. Please upload xlsx, xls, or csv files only.`);
      }

      try {
        const filePath = `${Date.now()}_${file.name}`;

        // Upload file to storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('spreadsheets')
          .upload(filePath, file);

        if (storageError) throw storageError;

        // Get the user's ID
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("User not authenticated");
        }

        // Insert record into spreadsheet_uploads table
        const { data: uploadData, error: dbError } = await supabase.from('spreadsheet_uploads').insert({
          filename: file.name,
          file_path: filePath,
          file_type: fileExt || '',
          uploaded_at: new Date().toISOString(),
          processed: false,
          user_id: user.id
        }).select().single();

        if (dbError) throw dbError;

        // Process the uploaded file
        if (uploadData) {
          await processUpload(uploadData.id);
        }

        return uploadData;
      } catch (error: any) {
        throw new Error(`Error uploading ${file.name}: ${error.message}`);
      }
    });

    try {
      await Promise.all(uploadPromises);
      toast.success("All files uploaded and processed successfully");
      setUploadDialogOpen(false);
      setUploadFiles(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
      fetchUploads();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Spreadsheet Integrations</h2>
      <Button onClick={() => setUploadDialogOpen(true)} className="mb-4">
        <Upload className="mr-2" /> Upload Spreadsheets
      </Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Filename</TableHead>
            <TableHead>Uploaded At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploads.map((upload) => (
            <TableRow key={upload.id}>
              <TableCell>{upload.filename}</TableCell>
              <TableCell>{upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleString() : 'N/A'}</TableCell>
              <TableCell>
                <Button variant="destructive" onClick={() => {
                  setSelectedUpload(upload);
                  setDeleteDialogOpen(true);
                }}>
                  <Trash2 className="mr-2" /> Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Spreadsheets</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="files">Select Files</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setUploadFiles(e.target.files)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFileUpload} disabled={!uploadFiles || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload and Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this upload?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (selectedUpload) {
                handleDelete(selectedUpload.id);
                setDeleteDialogOpen(false);
              }
            }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpreadsheetIntegrations;
