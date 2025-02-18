
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnType {
  type: 'units' | 'sale_price' | 'cost_price' | 'revenue' | 'cost' | 'other';
  index: number;
}

function identifyColumns(headers: string[]): ColumnType[] {
  return headers.map((header, index) => {
    const headerLower = header.toLowerCase();
    
    if (headerLower.includes('units') || headerLower.includes('quantity') || headerLower.includes('sold')) {
      return { type: 'units', index };
    }
    if (headerLower.includes('sale price') || headerLower.includes('unit price')) {
      return { type: 'sale_price', index };
    }
    if (headerLower.includes('cost price') || headerLower.includes('unit cost')) {
      return { type: 'cost_price', index };
    }
    if (headerLower.includes('total revenue') || headerLower.includes('revenue')) {
      return { type: 'revenue', index };
    }
    if (headerLower.includes('total cost') || headerLower.includes('cost')) {
      return { type: 'cost', index };
    }
    return { type: 'other', index };
  });
}

function extractNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols and any non-numeric characters except dots and minus
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    return Number(cleaned) || 0;
  }
  return 0;
}

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

    const { data: upload, error: uploadError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error(uploadError?.message || 'Upload not found');
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Failed to download file');
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
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        headers = data[0].map(header => String(header || '').trim());
        rows = data.slice(1).filter(row => row.length === headers.length);
      }
    } catch (error) {
      throw new Error(`Failed to parse file: ${error.message}`);
    }

    console.log('Headers found:', headers);
    const columns = identifyColumns(headers);
    console.log('Column types identified:', columns);

    let totalRevenue = 0;
    let totalCost = 0;
    let transactions = [];
    let warnings = [];

    // Find relevant columns
    const unitsCol = columns.find(col => col.type === 'units');
    const salePriceCol = columns.find(col => col.type === 'sale_price');
    const costPriceCol = columns.find(col => col.type === 'cost_price');
    const revenueCol = columns.find(col => col.type === 'revenue');
    const costCol = columns.find(col => col.type === 'cost');

    rows.forEach((row, rowIndex) => {
      const units = unitsCol ? extractNumber(row[unitsCol.index]) : 0;
      const salePrice = salePriceCol ? extractNumber(row[salePriceCol.index]) : 0;
      const costPrice = costPriceCol ? extractNumber(row[costPriceCol.index]) : 0;
      const statedRevenue = revenueCol ? extractNumber(row[revenueCol.index]) : 0;
      const statedCost = costCol ? extractNumber(row[costCol.index]) : 0;

      // Calculate actual values
      const calculatedRevenue = units * salePrice;
      const calculatedCost = units * costPrice;

      // Check for discrepancies
      if (revenueCol && Math.abs(calculatedRevenue - statedRevenue) > 0.01) {
        warnings.push(`Row ${rowIndex + 2}: Stated revenue (${statedRevenue}) differs from calculated revenue (${calculatedRevenue})`);
      }
      if (costCol && Math.abs(calculatedCost - statedCost) > 0.01) {
        warnings.push(`Row ${rowIndex + 2}: Stated cost (${statedCost}) differs from calculated cost (${calculatedCost})`);
      }

      // Use calculated values instead of stated values
      const rowRevenue = calculatedRevenue || statedRevenue;
      const rowCost = calculatedCost || statedCost;

      totalRevenue += rowRevenue;
      totalCost += rowCost;

      transactions.push({
        units,
        salePrice,
        costPrice,
        calculatedRevenue: rowRevenue,
        calculatedCost: rowCost,
        profit: rowRevenue - rowCost,
        originalRow: row
      });
    });

    const profit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    console.log('Financial calculations:', {
      totalRevenue,
      totalCost,
      profit,
      profitMargin,
      warningCount: warnings.length
    });

    const analysis = {
      total_rows: rows.length,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      profit: profit,
      profit_margin: profitMargin,
      headers: headers,
      column_types: columns,
      warnings: warnings,
      insights: [
        `Total Revenue: £${totalRevenue.toFixed(2)}`,
        `Total Cost: £${totalCost.toFixed(2)}`,
        `Total Profit: £${profit.toFixed(2)}`,
        `Profit Margin: ${profitMargin.toFixed(2)}%`,
        ...warnings
      ],
      sample_data: transactions.slice(0, 3),
      processed_at: new Date().toISOString()
    };

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
      throw new Error(`Failed to save analysis results: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
