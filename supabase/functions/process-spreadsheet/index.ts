
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    console.log('Starting to process upload:', uploadId);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch upload details with error handling
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError) {
      console.error('Error fetching upload:', uploadError);
      throw new Error(`Failed to fetch upload: ${uploadError.message}`);
    }
    if (!upload) {
      throw new Error('Upload not found');
    }

    console.log('Processing file:', upload.filename, 'Type:', upload.file_type);

    // Download file with error handling
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    if (!fileData) {
      throw new Error('No file data received');
    }

    let rows = [];
    let headers = [];

    try {
      if (upload.file_type === 'csv') {
        const text = await fileData.text();
        const lines = text.split('\n');
        headers = lines[0].split(',').map(header => header.trim());
        rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => line.split(',').map(cell => cell.trim()));
      } else {
        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          throw new Error('No sheets found in Excel file');
        }
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        if (data.length === 0) {
          throw new Error('Sheet is empty');
        }
        
        headers = data[0].map(header => String(header || '').trim());
        rows = data.slice(1).filter(row => 
          Array.isArray(row) && 
          row.length === headers.length && 
          row.some(cell => cell !== undefined && cell !== null && cell !== '')
        );
      }
    } catch (parseError) {
      console.error('Error parsing file:', parseError);
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

    console.log('Parsed data:', {
      headers,
      rowCount: rows.length,
      sampleRow: rows[0]
    });

    if (headers.length === 0) {
      throw new Error('No headers found in file');
    }
    if (rows.length === 0) {
      throw new Error('No data rows found in file');
    }

    // Process the financial data
    let totalRevenue = 0;
    let totalExpenses = 0;
    let transactions = [];

    // Map headers to their financial type
    const headerTypes = headers.map(header => {
      const headerLower = header.toLowerCase();
      if (headerLower.includes('revenue') || headerLower.includes('sales') || headerLower.includes('income')) {
        return 'revenue';
      } else if (headerLower.includes('expense') || headerLower.includes('cost')) {
        return 'expense';
      }
      return 'other';
    });

    console.log('Header types:', headerTypes);

    // Process each row
    rows.forEach((row, rowIndex) => {
      const transaction = {};
      headers.forEach((header, colIndex) => {
        const value = row[colIndex];
        const numberValue = typeof value === 'string' ? 
          Number(value.replace(/[^0-9.-]+/g, '')) : 
          Number(value);

        if (!isNaN(numberValue)) {
          if (headerTypes[colIndex] === 'revenue') {
            totalRevenue += numberValue;
          } else if (headerTypes[colIndex] === 'expense') {
            totalExpenses += numberValue;
          }
        }
        transaction[header] = value;
      });
      transactions.push(transaction);
    });

    const profitMargin = totalRevenue > 0 ? 
      ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    console.log('Financial calculations:', {
      totalRevenue,
      totalExpenses,
      profitMargin
    });

    const analysis = {
      total_rows: rows.length,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      profit_margin: profitMargin,
      headers: headers,
      header_types: headerTypes,
      insights: [
        `Total Revenue: £${totalRevenue.toFixed(2)}`,
        `Total Expenses: £${totalExpenses.toFixed(2)}`,
        `Profit Margin: ${profitMargin.toFixed(2)}%`
      ],
      sample_data: transactions.slice(0, 3),
      processed_at: new Date().toISOString()
    };

    // Update the database with results
    const { error: updateError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysis,
        analyzed_at: new Date().toISOString(),
        row_count: rows.length,
        processing_error: null
      })
      .eq('id', uploadId);

    if (updateError) {
      console.error('Error updating analysis results:', updateError);
      throw new Error(`Failed to save analysis results: ${updateError.message}`);
    }

    console.log('Successfully processed file');

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    // Try to update the upload record with the error
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseAdmin
        .from('spreadsheet_uploads')
        .update({
          processed: false,
          processing_error: error.message,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', req.uploadId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
