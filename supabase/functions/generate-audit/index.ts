
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function readSpreadsheetData(supabase: any, filePath: string) {
  console.log('Reading spreadsheet:', filePath);
  
  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = read(arrayBuffer);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = utils.sheet_to_json(worksheet);

    console.log('Spreadsheet data sample:', jsonData.slice(0, 2));
    return jsonData;
  } catch (error) {
    console.error('Error reading spreadsheet:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year } = await req.json();
    console.log('Generating audit for:', { user_id, month, year });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all spreadsheets for the user
    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id);

    if (spreadsheetsError) throw spreadsheetsError;
    
    if (!spreadsheets || spreadsheets.length === 0) {
      throw new Error('No spreadsheets found');
    }

    console.log('Processing spreadsheets:', spreadsheets.length);

    // Read data from all spreadsheets
    let allData: any[] = [];
    for (const sheet of spreadsheets) {
      try {
        const sheetData = await readSpreadsheetData(supabase, sheet.file_path);
        allData = allData.concat(sheetData);
        console.log(`Read ${sheetData.length} rows from ${sheet.filename}`);
      } catch (error) {
        console.error(`Error processing ${sheet.filename}:`, error);
        throw new Error(`Failed to process spreadsheet ${sheet.filename}: ${error.message}`);
      }
    }

    console.log(`Total rows processed: ${allData.length}`);

    // Calculate metrics
    const metrics = allData.reduce((acc, row) => {
      const revenue = Number(row['Total Revenue (£)'] || row['Revenue'] || 0);
      const cost = Number(row['Total Cost (£)'] || row['COGS (£)'] || 0);
      const units = Number(row['Units Sold'] || 0);

      return {
        revenue: acc.revenue + revenue,
        cost: acc.cost + cost,
        units: acc.units + units
      };
    }, { revenue: 0, cost: 0, units: 0 });

    const profitMargin = metrics.revenue > 0 
      ? ((metrics.revenue - metrics.cost) / metrics.revenue) * 100 
      : 0;

    // Create audit record
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: `Analysis of ${spreadsheets.length} uploads shows ${allData.length} transactions and ${metrics.units} units sold. Revenue: £${metrics.revenue.toFixed(2)} with ${profitMargin.toFixed(1)}% profit margin.`,
        monthly_metrics: {
          revenue: metrics.revenue,
          profit_margin: profitMargin,
          expense_ratio: metrics.revenue > 0 ? (metrics.cost / metrics.revenue) * 100 : 0,
          audit_alerts: metrics.revenue === 0 ? 1 : 0,
          previous_month: {
            revenue: 0,
            profit_margin: 0,
            expense_ratio: 0,
            audit_alerts: 0
          }
        },
        kpis: [
          {
            metric: "Revenue",
            value: `£${metrics.revenue.toFixed(2)}`,
            trend: "Current period"
          },
          {
            metric: "Profit Margin",
            value: `${profitMargin.toFixed(1)}%`,
            trend: "Current period"
          },
          {
            metric: "Units Sold",
            value: metrics.units.toString(),
            trend: "Current period"
          }
        ],
        recommendations: [
          {
            title: "Business Performance",
            description: `Your profit margin of ${profitMargin.toFixed(1)}% is ${profitMargin < 20 ? 'below' : 'above'} the recommended 20%. ${profitMargin < 20 ? 'Consider reviewing pricing strategy or reducing costs.' : 'Keep up the good work!'}`,
            impact: "High",
            difficulty: "Medium"
          },
          {
            title: "Product Analysis",
            description: `Consider tracking product-specific performance to identify top sellers.`,
            impact: "High",
            difficulty: "Medium"
          }
        ]
      })
      .select()
      .single();

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully', data: auditData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
