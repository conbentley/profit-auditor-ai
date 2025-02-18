
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function analyzeSpreadsheetData(workbook: any) {
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = utils.sheet_to_json(firstSheet);
  const rowCount = data.length;
  
  // Analyze columns and data types
  const columns = new Set<string>();
  const dataTypes: Record<string, Set<string>> = {};
  const numericColumns: Set<string> = new Set();
  
  data.forEach((row: any) => {
    Object.entries(row).forEach(([key, value]) => {
      columns.add(key);
      
      if (!dataTypes[key]) {
        dataTypes[key] = new Set();
      }
      
      const type = typeof value;
      dataTypes[key].add(type);
      
      // Check if column contains numeric values
      if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
        numericColumns.add(key);
      }
    });
  });

  // Calculate basic statistics for numeric columns
  const statistics: Record<string, any> = {};
  numericColumns.forEach(column => {
    const values = data.map((row: any) => Number(row[column])).filter((n: number) => !isNaN(n));
    if (values.length > 0) {
      statistics[column] = {
        min: Math.min(...values),
        max: Math.max(...values),
        average: values.reduce((a: number, b: number) => a + b, 0) / values.length,
        total: values.reduce((a: number, b: number) => a + b, 0)
      };
    }
  });

  // Generate insights
  const insights = [];
  
  // Check for potential financial columns
  numericColumns.forEach(column => {
    const columnLower = column.toLowerCase();
    if (columnLower.includes('amount') || 
        columnLower.includes('price') || 
        columnLower.includes('cost') || 
        columnLower.includes('revenue') || 
        columnLower.includes('profit')) {
      insights.push({
        type: 'financial_column',
        column,
        message: `Found potential financial data in column "${column}"`,
        statistics: statistics[column]
      });
    }
  });

  // Check for date patterns
  columns.forEach(column => {
    const columnLower = column.toLowerCase();
    if (columnLower.includes('date') || 
        columnLower.includes('time') || 
        columnLower.includes('period')) {
      insights.push({
        type: 'temporal_column',
        column,
        message: `Found potential date/time data in column "${column}"`
      });
    }
  });

  return {
    rowCount,
    columnCount: columns.size,
    columns: Array.from(columns),
    dataTypes: Object.fromEntries(
      Object.entries(dataTypes).map(([k, v]) => [k, Array.from(v)])
    ),
    statistics,
    insights,
    sampleData: data.slice(0, 5) // Include first 5 rows as sample
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get file from request
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization')?.split('Bearer ')[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Generate safe filename and path
    const timestamp = new Date().toISOString();
    const fileExt = file.name.split('.').pop();
    const safeName = `${timestamp}-${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${user.id}/${safeName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('spreadsheets')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file to storage' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Read and analyze the file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer);
    const analysis = await analyzeSpreadsheetData(workbook);

    // Create database record
    const { error: dbError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        file_type: file.type,
        row_count: analysis.rowCount,
        analysis_results: analysis,
        data_summary: {
          columns: analysis.columns,
          insights: analysis.insights
        },
        processed: true,
        analyzed_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('Database insert error:', dbError);
      // Attempt to clean up the uploaded file if database insert fails
      await supabase.storage
        .from('spreadsheets')
        .remove([filePath]);

      return new Response(
        JSON.stringify({ error: 'Failed to save file metadata' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'File uploaded and analyzed successfully',
        analysis
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
