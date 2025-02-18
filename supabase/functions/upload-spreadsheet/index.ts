
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Common financial column indicators
const AMOUNT_INDICATORS = ['amount', 'total', 'sum', 'price', 'revenue', 'income', 'payment'];
const DATE_INDICATORS = ['date', 'period', 'timestamp'];
const DESCRIPTION_INDICATORS = ['description', 'details', 'notes', 'memo', 'narrative'];

function identifyColumnType(columnName: string, values: any[]): string {
  const lowerColumnName = columnName.toLowerCase();
  
  // Check if it's a date column
  if (DATE_INDICATORS.some(indicator => lowerColumnName.includes(indicator))) {
    return 'date';
  }

  // Check if it's an amount column
  if (AMOUNT_INDICATORS.some(indicator => lowerColumnName.includes(indicator))) {
    return 'amount';
  }

  // Check if it's a description column
  if (DESCRIPTION_INDICATORS.some(indicator => lowerColumnName.includes(indicator))) {
    return 'description';
  }

  // Check if column contains mostly numbers
  const numericCount = values.filter(v => !isNaN(Number(v))).length;
  if (numericCount / values.length > 0.7) {
    return 'numeric';
  }

  return 'text';
}

function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and commas, then parse
    const cleaned = value.replace(/[$£€,]/g, '');
    return Number(cleaned) || 0;
  }
  return 0;
}

async function analyzeSpreadsheetData(workbook: any) {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    throw new Error('Spreadsheet is empty');
  }

  console.log('Raw data sample:', data.slice(0, 2));

  const columns = Object.keys(data[0]);
  const columnTypes = {};
  let totalRevenue = 0;
  let totalCost = 0;
  let transactionCount = 0;
  const products = new Set();

  // Identify column types
  columns.forEach(column => {
    const values = data.map(row => row[column]);
    columnTypes[column] = identifyColumnType(column, values);
    console.log(`Column ${column} identified as ${columnTypes[column]}`);
  });

  // Find amount columns
  const amountColumns = columns.filter(column => 
    columnTypes[column] === 'amount' || 
    columnTypes[column] === 'numeric'
  );

  console.log('Identified amount columns:', amountColumns);

  // Process each row
  data.forEach(row => {
    let rowRevenue = 0;
    let rowCost = 0;

    amountColumns.forEach(column => {
      const amount = parseNumber(row[column]);
      
      // Determine if amount is revenue or cost based on column name and value
      const columnLower = column.toLowerCase();
      if (columnLower.includes('revenue') || columnLower.includes('income') || 
          columnLower.includes('sales') || amount > 0) {
        rowRevenue += amount;
      } else if (columnLower.includes('cost') || columnLower.includes('expense') || 
                 columnLower.includes('payment') || amount < 0) {
        rowCost += Math.abs(amount);
      }
    });

    totalRevenue += rowRevenue;
    totalCost += rowCost;
    transactionCount++;

    // Track unique products if product column exists
    const productColumn = columns.find(col => 
      col.toLowerCase().includes('product') || 
      col.toLowerCase().includes('item')
    );
    if (productColumn && row[productColumn]) {
      products.add(row[productColumn]);
    }
  });

  const summary = {
    total_rows: data.length,
    processed_transactions: transactionCount,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    profit_margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
    unique_products: products.size,
    column_types: columnTypes,
    sample_products: Array.from(products).slice(0, 5)
  };

  console.log('Analysis summary:', summary);

  return {
    summary,
    sample_data: data.slice(0, 5),
    column_analysis: columnTypes
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
    console.log('Starting data analysis for file:', file.name);
    const analysisResults = await analyzeSpreadsheetData(workbook);
    console.log('Analysis complete with results:', analysisResults);

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
        row_count: analysisResults.summary.total_rows,
        data_summary: analysisResults.summary,
        analysis_results: {
          sample_data: analysisResults.sample_data,
          column_analysis: analysisResults.column_analysis
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

    // After successful analysis, trigger an audit generation
    await supabase.functions.invoke('generate-audit', {
      body: {
        user_id: user.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      }
    });

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
