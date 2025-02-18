
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { read, utils } from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting file upload process...");

    // **Get file from formData**
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error("No file uploaded");

    console.log(`File received: ${file.name} (${file.type})`);

    // **Initialize Supabase Client**
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // **Extract User ID**
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) throw new Error("Unauthorized");

    // **Read File Content as ArrayBuffer**
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: "array" });

    // **Process All Sheets**
    const allSheetsData: Record<string, any[]> = {};
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = utils.sheet_to_json(sheet, { header: 1 });

      if (jsonData.length > 1) {
        allSheetsData[sheetName] = jsonData.slice(1); // Exclude headers
      }
    });

    if (!Object.keys(allSheetsData).length) throw new Error("No valid data found in Excel file");

    console.log("Extracted Data:", allSheetsData);

    // **Perform Basic Analysis**
    const insights: any[] = [];
    
    Object.entries(allSheetsData).forEach(([sheetName, data]) => {
      if (data.length === 0) return;

      const numRows = data.length;
      const numColumns = data[0].length;
      const columnSums = data[0].map((_, colIndex) => 
        data.reduce((sum, row) => sum + (parseFloat(row[colIndex]) || 0), 0)
      );

      insights.push({
        sheet: sheetName,
        total_rows: numRows,
        total_columns: numColumns,
        column_sums: columnSums,
      });
    });

    console.log("Generated Insights:", insights);

    // **Store File in Supabase**
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error: storageError } = await supabase.storage
      .from("spreadsheets")
      .upload(filePath, file);
    if (storageError) throw storageError;

    // **Save Upload Metadata to DB**
    const { error: uploadError } = await supabase
      .from("spreadsheet_uploads")
      .insert({
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        file_type: fileExt,
        processed: true,
        data_summary: allSheetsData,
        analysis_results: insights,
        row_count: Object.values(allSheetsData).reduce((sum, sheet) => sum + sheet.length, 0),
        uploaded_at: new Date().toISOString(),
      });

    if (uploadError) throw uploadError;

    return new Response(
      JSON.stringify({
        message: "File processed successfully",
        file_path: filePath,
        insights,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing file:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
