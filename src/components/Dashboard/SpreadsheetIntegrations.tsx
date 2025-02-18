
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
  uploaded_at: string | null;
  processed: boolean | null;
  processing_error: string | null;
  analysis_results?: any;
}

const SpreadsheetIntegrations = () => {
  const [uploads, setUploads] = useState<SpreadsheetUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<SpreadsheetUpload | null>(null);

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

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Spreadsheet Integrations</h2>
      <Button onClick={() => setOpen(true)} className="mb-4">
        <Upload className="mr-2" /> Upload Spreadsheet
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
                  setOpen(true);
                }}>
                  <Trash2 className="mr-2" /> Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button>Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this upload?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (selectedUpload) {
                handleDelete(selectedUpload.id);
                setOpen(false);
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
