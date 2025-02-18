
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
  units: number;
}

function inferColumnType(headers: string[], values: any[]): Record<string, string> {
  const columnTypes: Record<string, string> = {};
  
  headers.forEach((header, index) => {
    const sampleValues = values.slice(0, 10).map(row => row[header]);
    const nonEmptyValues = sampleValues.filter(v => v !== undefined && v !== null && v !== '');
    
    if (nonEmptyValues.length === 0) return;

    // Check if majority of values are numbers
    const numberCount = nonEmptyValues.filter(v => !isNaN(parseFloat(v))).length;
    if (numberCount / nonEmptyValues.length > 0.7) {
      if (header.toLowerCase().includes('price') || 
          header.toLowerCase().includes('revenue') || 
          header.toLowerCase().includes('cost') ||
          header.toLowerCase().includes('amount')) {
        columnTypes[header] = 'money';
      } else if (header.toLowerCase().includes('quantity') ||
                 header.toLowerCase().includes('units') ||
                 header.toLowerCase().includes('count')) {
        columnTypes[header] = 'quantity';
      }
    }
  });

  return columnTypes;
}

function processSpreadsheetData(data: any[]): ProcessedData {
  if (!data || data.length === 0) {
    console.log('No data to process');
    return { totalRevenue: 0, totalCost: 0, transactionCount: 0, transactions: [], units: 0 };
  }

  const headers = Object.keys(data[0]);
  console.log('Found headers:', headers);

  const columnTypes = inferColumnType(headers, data);
  console.log('Inferred column types:', columnTypes);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnits = 0;
  const transactions = [];

  // Find potential money and quantity columns
  const moneyColumns = Object.entries(columnTypes)
    .filter(([_, type]) => type === 'money')
    .map(([header]) => header);
  
  const quantityColumns = Object.entries(columnTypes)
    .filter(([_, type]) => type === 'quantity')
    .map(([header]) => header);

  console.log('Money columns:', moneyColumns);
  console.log('Quantity columns:', quantityColumns);

  data.forEach((row, index) => {
    let rowRevenue = 0;
    let rowCost = 0;
    let rowUnits = 0;

    // Process money columns
    moneyColumns.forEach(column => {
      const value = parseFloat(row[column]) || 0;
      if (column.toLowerCase().includes('cost') || value < 0) {
        rowCost += Math.abs(value);
      } else {
        rowRevenue += value;
      }
    });

    // Process quantity columns
    quantityColumns.forEach(column => {
      rowUnits += parseFloat(row[column]) || 0;
    });

    // If we have a quantity and price but no direct revenue
    if (rowUnits > 0 && rowRevenue === 0) {
      const priceColumns = moneyColumns.filter(col => 
        col.toLowerCase().includes('price') || 
        col.toLowerCase().includes('rate')
      );
      
      if (priceColumns.length > 0) {
        const price = parseFloat(row[priceColumns[0]]) || 0;
        rowRevenue = rowUnits * price;
      }
    }

    // Only count as transaction if we have either revenue, cost, or units
    if (rowRevenue > 0 || rowCost > 0 || rowUnits > 0) {
      totalRevenue += rowRevenue;
      totalCost += rowCost;
      totalUnits += rowUnits;

      transactions.push({
        revenue: rowRevenue,
        cost: rowCost,
        units: rowUnits,
        row_index: index + 1,
        ...row // Keep original data for reference
      });
    }
  });

  const summary = {
    totalRevenue,
    totalCost,
    transactionCount: transactions.length,
    transactions,
    units: totalUnits
  };

  console.log('Processing summary:', {
    rows_processed: data.length,
    transactions_found: transactions.length,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    total_units: totalUnits
  });

  return summary;
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

    // Process all sheets
    let combinedData: ProcessedData = {
      totalRevenue: 0,
      totalCost: 0,
      transactionCount: 0,
      transactions: [],
      units: 0
    };

    for (const sheetName of workbook.SheetNames) {
      console.log('Processing sheet:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length > 0) {
        const sheetData = processSpreadsheetData(data);
        combinedData.totalRevenue += sheetData.totalRevenue;
        combinedData.totalCost += sheetData.totalCost;
        combinedData.transactionCount += sheetData.transactionCount;
        combinedData.units += sheetData.units;
        combinedData.transactions = [
          ...combinedData.transactions,
          ...sheetData.transactions.map(t => ({ ...t, sheet: sheetName }))
        ];
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        processed: true,
        row_count: combinedData.transactions.length,
        data_summary: {
          total_revenue: combinedData.totalRevenue,
          total_expenses: combinedData.totalCost,
          transaction_count: combinedData.transactionCount,
          total_units: combinedData.units,
          transactions: combinedData.transactions,
          profit_margin: combinedData.totalRevenue > 0 
            ? ((combinedData.totalRevenue - combinedData.totalCost) / combinedData.totalRevenue) * 100 
            : 0
        }
      })
      .select()
      .single();

    if (uploadError) {
      throw uploadError;
    }

    console.log('Upload processed successfully:', {
      filename: file.name,
      transactions: combinedData.transactionCount,
      revenue: combinedData.totalRevenue
    });

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
