
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessedData {
  totalRevenue: number;
  totalCost: number;
  transactionCount: number;
  transactions: any[];
}

function processSpreadsheetData(data: any[]): ProcessedData {
  let totalRevenue = 0;
  let totalCost = 0;
  let transactionCount = 0;
  const transactions = [];

  // Helper function to get value regardless of case
  const getValue = (row: any, possibleKeys: string[]): any => {
    for (const key of possibleKeys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase() === key.toLowerCase()) {
          return row[rowKey];
        }
      }
    }
    return null;
  };

  // Process each row
  for (const row of data) {
    // Try to detect the format of the data
    const date = getValue(row, ['date', 'Date', 'DATE']);
    const unitsSold = getValue(row, ['Units Sold', 'units sold', 'quantity', 'Quantity']);
    const salePrice = getValue(row, ['Sale Price (£)', 'sale price', 'price', 'unit price']);
    const totalRevenueRow = getValue(row, ['Total Revenue (£)', 'revenue', 'total revenue']);
    const costRow = getValue(row, ['COGS (£)', 'cost', 'Total Cost (£)', 'total cost']);

    let rowRevenue = 0;
    let rowCost = 0;

    // Calculate revenue
    if (totalRevenueRow && !isNaN(parseFloat(totalRevenueRow))) {
      rowRevenue = parseFloat(totalRevenueRow);
    } else if (unitsSold && salePrice && !isNaN(parseFloat(unitsSold)) && !isNaN(parseFloat(salePrice))) {
      rowRevenue = parseFloat(unitsSold) * parseFloat(salePrice);
    }

    // Calculate cost
    if (costRow && !isNaN(parseFloat(costRow))) {
      rowCost = parseFloat(costRow);
    }

    if (rowRevenue > 0 || rowCost > 0) {
      transactionCount++;
      totalRevenue += rowRevenue;
      totalCost += rowCost;

      transactions.push({
        date: date,
        revenue: rowRevenue,
        cost: rowCost,
        units: unitsSold,
        sku: getValue(row, ['SKU', 'sku', 'product_id']),
      });
    }
  }

  console.log('Processed data:', {
    totalRevenue,
    totalCost,
    transactionCount,
    sampleTransactions: transactions.slice(0, 2)
  });

  return {
    totalRevenue,
    totalCost,
    transactionCount,
    transactions
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

    console.log('Processing file:', file.name);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Process the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Found rows:', data.length);

    const processedData = processSpreadsheetData(data);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user ID from the auth header
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Save the file metadata and processing results
    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        processed: true,
        row_count: data.length,
        data_summary: {
          total_revenue: processedData.totalRevenue,
          total_expenses: processedData.totalCost,
          transaction_count: processedData.transactionCount,
          transactions: processedData.transactions,
          profit_margin: processedData.totalRevenue > 0 
            ? ((processedData.totalRevenue - processedData.totalCost) / processedData.totalRevenue) * 100 
            : 0
        }
      })
      .select()
      .single();

    if (uploadError) {
      throw uploadError;
    }

    console.log('Spreadsheet processed and saved successfully');

    return new Response(
      JSON.stringify({ 
        message: 'File processed successfully',
        data: uploadData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
