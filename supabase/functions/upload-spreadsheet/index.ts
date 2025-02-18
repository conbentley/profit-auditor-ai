
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function analyzeSpreadsheetData(workbook: any) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = utils.sheet_to_json(worksheet);

  const rowCount = data.length;
  const columnCount = Object.keys(data[0] || {}).length;

  // Basic financial metrics
  const numericColumns = {};
  const columnTypes = {};

  // Analyze each column
  Object.keys(data[0] || {}).forEach(column => {
    const values = data.map(row => row[column]);
    const numericValues = values.filter(v => !isNaN(Number(v)));
    
    if (numericValues.length / values.length > 0.7) {
      numericColumns[column] = numericValues.map(Number);
      columnTypes[column] = 'numeric';
    } else {
      columnTypes[column] = 'text';
    }
  });

  // Calculate basic statistics for numeric columns
  const statistics = {};
  Object.entries(numericColumns).forEach(([column, values]: [string, number[]]) => {
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    statistics[column] = {
      sum,
      average: avg,
      max,
      min,
      count: values.length
    };
  });

  // Identify potential financial columns
  const financialIndicators = ['amount', 'revenue', 'cost', 'profit', 'price', 'total'];
  const potentialFinancialColumns = Object.keys(columnTypes).filter(column => {
    const lowerColumn = column.toLowerCase();
    return columnTypes[column] === 'numeric' || 
           financialIndicators.some(indicator => lowerColumn.includes(indicator));
  });

  return {
    summary: {
      rowCount,
      columnCount,
      columnTypes,
      potentialFinancialColumns
    },
    statistics,
    sampleData: data.slice(0, 5) // First 5 rows as sample
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user information
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    // Read file content for analysis
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // Analyze the data
    console.log('Starting data analysis...');
    const analysisResults = await analyzeSpreadsheetData(workbook);
    console.log('Analysis complete:', analysisResults);

    // Upload file to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('spreadsheets')
      .upload(fileName, file);

    if (storageError) {
      throw storageError;
    }

    // Create database record with analysis results
    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        file_path: fileName,
        processed: true,
        row_count: analysisResults.summary.rowCount,
        data_summary: analysisResults.summary,
        analysis_results: {
          statistics: analysisResults.statistics,
          sampleData: analysisResults.sampleData
        },
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (uploadError) {
      await supabase.storage
        .from('spreadsheets')
        .remove([fileName]);
      throw uploadError;
    }

    return new Response(
      JSON.stringify({ 
        message: 'File uploaded and analyzed successfully',
        data: uploadData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing upload:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
