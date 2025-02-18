
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    console.log('Starting analysis for user:', user_id);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all spreadsheets for processing
    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id)
      .order('uploaded_at', { ascending: true });

    if (spreadsheetsError) throw spreadsheetsError;
    if (!spreadsheets?.length) {
      return new Response(
        JSON.stringify({ error: 'No spreadsheets found to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Found ${spreadsheets.length} spreadsheets`);

    // Process each spreadsheet
    let combinedData: any[] = [];
    for (const sheet of spreadsheets) {
      try {
        console.log(`Processing spreadsheet: ${sheet.filename}`);
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('spreadsheets')
          .download(sheet.file_path);

        if (downloadError) {
          console.error(`Error downloading ${sheet.filename}:`, downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet);
        
        console.log(`Extracted ${jsonData.length} rows from ${sheet.filename}`);
        console.log('Sheet headers:', JSON.stringify(Object.keys(jsonData[0] || {}), null, 2));
        
        combinedData = combinedData.concat(jsonData);
      } catch (error) {
        console.error(`Error processing ${sheet.filename}:`, error);
      }
    }

    if (combinedData.length === 0) {
      throw new Error('No valid data found in spreadsheets');
    }

    console.log(`Total combined rows: ${combinedData.length}`);

    // Calculate metrics from the data
    const metrics = combinedData.reduce((acc, row) => {
      const revenue = Number(row['Total Revenue (£)'] || row['Revenue'] || row['Sale Price (£)'] || 0);
      const cost = Number(row['Total Cost (£)'] || row['Cost'] || row['COGS (£)'] || 0);
      return {
        revenue: acc.revenue + revenue,
        cost: acc.cost + cost,
      };
    }, { revenue: 0, cost: 0 });

    const profitMargin = ((metrics.revenue - metrics.cost) / metrics.revenue) * 100;
    const expenseRatio = (metrics.cost / metrics.revenue) * 100;

    // Create structured audit data
    const auditData = {
      summary: `Analysis of ${combinedData.length} records shows total revenue of £${metrics.revenue.toFixed(2)} with a profit margin of ${profitMargin.toFixed(2)}%.`,
      monthly_metrics: {
        revenue: metrics.revenue,
        profit_margin: profitMargin,
        expense_ratio: expenseRatio,
        audit_alerts: 0,
        previous_month: {
          revenue: 0,
          profit_margin: 0,
          expense_ratio: 0,
          audit_alerts: 0
        }
      },
      kpis: [
        {
          metric: "Total Revenue",
          value: `£${metrics.revenue.toFixed(2)}`,
          trend: "+0%"
        },
        {
          metric: "Profit Margin",
          value: `${profitMargin.toFixed(2)}%`,
          trend: "+0%"
        }
      ],
      recommendations: [
        {
          title: "Monitor Profit Margins",
          description: `Current profit margin is ${profitMargin.toFixed(2)}%. Consider optimizing costs to improve margins.`,
          impact: "High",
          difficulty: "Medium"
        }
      ]
    };

    // Create audit record
    const { data: audit, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary: auditData.summary,
        monthly_metrics: auditData.monthly_metrics,
        kpis: auditData.kpis,
        recommendations: auditData.recommendations
      })
      .select()
      .single();

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully', data: audit }),
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
