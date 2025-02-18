import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, Loader2, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import FileUpload from "@/components/FileUpload";

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
  const queryClient = useQueryClient();

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

  const generateAudit = async (spreadsheetData: any[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in to generate an audit");

      // Clear existing audit
      await supabase
        .from('financial_audits')
        .delete()
        .eq('user_id', user.id);

      // Generate new comprehensive audit
      const response = await supabase.functions.invoke('generate-audit', {
        body: { 
          user_id: user.id,
          spreadsheet_data: spreadsheetData.map(upload => ({
            id: upload.id,
            filename: upload.filename,
            analysis_results: upload.analysis_results
          }))
        }
      });

      if (response.error) throw response.error;

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['latest-audit'] });

      toast.success("Audit report generated successfully");
    } catch (error) {
      console.error("Failed to generate audit:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate audit");
    }
  };

  const handleUploadSuccess = async (result: any) => {
    setUploadDialogOpen(false);
    await fetchUploads();
    await generateAudit(uploads);
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
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {uploads.map((upload) => (
            <TableRow key={upload.id}>
              <TableCell>{upload.filename}</TableCell>
              <TableCell>{upload.uploaded_at ? new Date(upload.uploaded_at).toLocaleString() : 'N/A'}</TableCell>
              <TableCell>
                {upload.processed ? (
                  <span className="text-green-600">Processed</span>
                ) : upload.processing_error ? (
                  <span className="text-red-600">Error: {upload.processing_error}</span>
                ) : (
                  <span className="text-yellow-600">Processing...</span>
                )}
              </TableCell>
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
          <FileUpload onUploadSuccess={handleUploadSuccess} />
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
