
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function readSpreadsheetData(supabase: any, filePath: string, userId: string) {
  console.log('Reading spreadsheet:', { filePath, userId });
  
  try {
    // Check if file exists in storage
    const { data: fileExists, error: existsError } = await supabase.storage
      .from('spreadsheets')
      .list(userId + '/', {
        search: filePath.split('/').pop()
      });

    console.log('Storage check result:', { fileExists, existsError });

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(filePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    console.log('File downloaded successfully');

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = read(arrayBuffer);
    
    console.log('Workbook sheets:', workbook.SheetNames);
    
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Log column headers
    const range = utils.decode_range(worksheet['!ref'] || 'A1');
    const headers = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cell = worksheet[utils.encode_cell({ r: range.s.r, c: C })];
      headers.push(cell ? cell.v : undefined);
    }
    console.log('Sheet headers:', headers);

    const jsonData = utils.sheet_to_json(worksheet);
    console.log('Parsed rows:', jsonData.length);
    console.log('First row sample:', jsonData[0]);

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
    console.log('Starting audit generation:', { user_id, month, year });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all spreadsheets for the user
    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id);

    if (spreadsheetsError) {
      console.error('Error fetching spreadsheets:', spreadsheetsError);
      throw spreadsheetsError;
    }
    
    if (!spreadsheets || spreadsheets.length === 0) {
      throw new Error('No spreadsheets found');
    }

    console.log('Found spreadsheets:', {
      count: spreadsheets.length,
      files: spreadsheets.map(s => ({
        id: s.id,
        filename: s.filename,
        path: s.file_path
      }))
    });

    // Read data from all spreadsheets
    let allData: any[] = [];
    for (const sheet of spreadsheets) {
      try {
        console.log('Processing spreadsheet:', sheet.filename);
        const sheetData = await readSpreadsheetData(supabase, sheet.file_path, user_id);
        allData = allData.concat(sheetData);
        console.log(`Processed ${sheetData.length} rows from ${sheet.filename}`);
      } catch (error) {
        console.error(`Error processing ${sheet.filename}:`, error);
        throw new Error(`Failed to process spreadsheet ${sheet.filename}: ${error.message}`);
      }
    }

    console.log('Data processing summary:', {
      totalRows: allData.length,
      sampleFields: allData.length > 0 ? Object.keys(allData[0]) : []
    });

    // Calculate metrics with validation
    const metrics = allData.reduce((acc, row, index) => {
      const revenue = Number(row['Total Revenue (£)'] || row['Revenue'] || row['Sale Price (£)'] || 0);
      const cost = Number(row['Total Cost (£)'] || row['COGS (£)'] || row['Cost'] || 0);
      const units = Number(row['Units Sold'] || row['Quantity'] || 0);

      if (isNaN(revenue) || isNaN(cost) || isNaN(units)) {
        console.warn(`Invalid data in row ${index}:`, { revenue, cost, units, rawRow: row });
      }

      return {
        revenue: acc.revenue + (isNaN(revenue) ? 0 : revenue),
        cost: acc.cost + (isNaN(cost) ? 0 : cost),
        units: acc.units + (isNaN(units) ? 0 : units)
      };
    }, { revenue: 0, cost: 0, units: 0 });

    console.log('Calculated metrics:', metrics);

    const profitMargin = metrics.revenue > 0 
      ? ((metrics.revenue - metrics.cost) / metrics.revenue) * 100 
      : 0;

    // Create audit record
    const auditRecord = {
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
          trend: `+${((metrics.revenue - 0) / 100).toFixed(1)}%`
        },
        {
          metric: "Profit Margin",
          value: `${profitMargin.toFixed(1)}%`,
          trend: `+${profitMargin.toFixed(1)}%`
        },
        {
          metric: "Units Sold",
          value: metrics.units.toString(),
          trend: `+${metrics.units}%`
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
          description: `Analyzed ${metrics.units} units across ${allData.length} transactions. Consider optimizing inventory levels based on sales velocity.`,
          impact: "High",
          difficulty: "Medium"
        }
      ]
    };

    console.log('Creating audit record:', auditRecord);

    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert(auditRecord)
      .select()
      .single();

    if (auditError) {
      console.error('Error creating audit record:', auditError);
      throw auditError;
    }

    console.log('Audit generated successfully:', auditData.id);

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
