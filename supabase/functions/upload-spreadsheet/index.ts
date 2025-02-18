
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    // Log file details for debugging
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Read file content
    const fileContent = await file.text();
    console.log('File content preview:', fileContent.substring(0, 500));

    // Parse CSV/Excel content
    const rows = fileContent.split('\n').map(row => row.split(','));
    console.log('Parsed rows preview:', rows.slice(0, 5));

    // Extract headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Basic analysis of the data
    const dataSummary = {
      totalRows: dataRows.length,
      columns: headers,
      sampleData: dataRows.slice(0, 3)
    };

    console.log('Data summary:', dataSummary);

    return new Response(
      JSON.stringify({
        message: 'File processed successfully',
        summary: dataSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing file:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
