
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log('Processing upload:', uploadId);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch upload details
    const { data: upload, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) throw new Error('Upload not found');
    console.log('Found upload:', upload.filename);

    // Download file content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError) throw downloadError;

    // Process file based on type
    let rows = [];
    let headers = [];

    if (upload.file_type === 'text/csv') {
      const text = await fileData.text();
      const lines = text.split('\n');
      headers = lines[0].split(',').map(header => header.trim());
      rows = lines.slice(1)
        .filter(line => line.trim())
        .map(line => line.split(',').map(cell => cell.trim()));
    } else {
      // Handle Excel files
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      headers = data[0].map(header => String(header).trim());
      rows = data.slice(1).filter(row => row.length === headers.length);
    }

    console.log('Extracted headers:', headers);
    console.log('Number of rows:', rows.length);

    // Identify numeric columns and financial metrics
    const numericColumns = headers.map((header, index) => {
      const isNumeric = rows.every(row => !isNaN(Number(row[index])));
      const headerLower = header.toLowerCase();
      const isFinancial = headerLower.includes('amount') || 
                         headerLower.includes('revenue') || 
                         headerLower.includes('cost') ||
                         headerLower.includes('price') ||
                         headerLower.includes('profit') ||
                         headerLower.includes('expense');
      return { isNumeric, isFinancial };
    });

    // Initialize metrics
    let totalRevenue = 0;
    let totalExpenses = 0;
    let transactions = [];

    // Process data rows
    rows.forEach(row => {
      const transaction = {};
      let rowRevenue = 0;
      let rowExpense = 0;

      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        const value = row[index];
        const { isNumeric, isFinancial } = numericColumns[index];

        if (isNumeric && isFinancial) {
          const numValue = Number(value);
          transaction[header] = numValue;

          if (headerLower.includes('revenue') || headerLower.includes('income') || headerLower.includes('sales')) {
            rowRevenue += numValue;
          } else if (headerLower.includes('expense') || headerLower.includes('cost')) {
            rowExpense += numValue;
          }
        } else {
          transaction[header] = value;
        }
      });

      totalRevenue += rowRevenue;
      totalExpenses += rowExpense;
      transactions.push(transaction);
    });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    // Generate analysis results
    const analysis = {
      total_rows: rows.length,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      profit_margin: profitMargin,
      headers: headers,
      insights: [
        `Total Revenue: £${totalRevenue.toFixed(2)}`,
        `Total Expenses: £${totalExpenses.toFixed(2)}`,
        `Profit Margin: ${profitMargin.toFixed(2)}%`
      ],
      summary: {
        revenue_streams: headers.filter((h, i) => 
          numericColumns[i].isFinancial && h.toLowerCase().includes('revenue')).length,
        expense_categories: headers.filter((h, i) => 
          numericColumns[i].isFinancial && h.toLowerCase().includes('expense')).length
      }
    };

    console.log('Analysis complete:', analysis);

    // Update the upload record
    const { error: updateError } = await supabase
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysis,
        analyzed_at: new Date().toISOString(),
        row_count: rows.length,
        data_summary: {
          headers: headers,
          numeric_columns: numericColumns,
          sample_size: Math.min(rows.length, 5)
        }
      })
      .eq('id', uploadId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
