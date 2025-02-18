
import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadProps {
  onUploadSuccess: (result: any) => void;
}

const FileUpload = ({ onUploadSuccess }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const processExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });

          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet);

          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv'].includes(fileExt || '')) {
        toast.error('Please upload only Excel or CSV files');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    setIsUploading(true);
    try {
      // Get the user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload file to Supabase Storage
      const filePath = `${Date.now()}_${file.name}`;
      const { data: storageData, error: storageError } = await supabase.storage
        .from('spreadsheets')
        .upload(filePath, file);

      if (storageError) throw storageError;

      // Extract data from Excel file
      const extractedData = await processExcelFile(file);
      
      // Create record in spreadsheet_uploads table
      const { data: uploadData, error: dbError } = await supabase
        .from('spreadsheet_uploads')
        .insert({
          filename: file.name,
          file_path: filePath,
          file_type: file.name.split('.').pop() || '',
          uploaded_at: new Date().toISOString(),
          processed: false,
          user_id: user.id,
          row_count: extractedData.length
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Process the uploaded file using the edge function
      if (uploadData) {
        const { data: processResult, error: processError } = await supabase.functions
          .invoke('process-spreadsheet', {
            body: { uploadId: uploadData.id }
          });

        if (processError) throw processError;

        toast.success('File uploaded and processed successfully');
        onUploadSuccess(processResult);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Error uploading file');
    } finally {
      setIsUploading(false);
      setFile(null);
      // Reset the input
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="w-full"
      />
      <Button 
        onClick={handleUpload} 
        disabled={isUploading || !file}
        className="w-full"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Upload & Analyze'
        )}
      </Button>
    </div>
  );
};

export default FileUpload;
