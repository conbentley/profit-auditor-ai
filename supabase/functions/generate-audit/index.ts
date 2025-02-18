
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

    // Get spreadsheets
    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id);

    if (spreadsheetsError) throw spreadsheetsError;
    if (!spreadsheets?.length) throw new Error('No spreadsheets found');

    console.log(`Found ${spreadsheets.length} spreadsheets`);

    // Process each spreadsheet
    let allData = [];
    for (const sheet of spreadsheets) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('spreadsheets')
        .download(sheet.file_path);

      if (downloadError) throw downloadError;

      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet);
      allData = allData.concat(jsonData);
    }

    console.log(`Processed ${allData.length} total rows`);

    // Prepare data summary for OpenAI
    const dataSummary = {
      totalRows: allData.length,
      columns: Object.keys(allData[0] || {}),
      sampleData: allData.slice(0, 5),
      totals: allData.reduce((acc, row) => {
        const revenue = Number(row['Revenue'] || row['Total Revenue (£)'] || 0);
        const cost = Number(row['Cost'] || row['Total Cost (£)'] || 0);
        const units = Number(row['Units Sold'] || row['Quantity'] || 0);
        
        return {
          revenue: acc.revenue + revenue,
          cost: acc.cost + cost,
          units: acc.units + units
        };
      }, { revenue: 0, cost: 0, units: 0 })
    };

    // Get AI analysis
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst AI. Analyze the business data and provide insights in a structured format.'
          },
          {
            role: 'user',
            content: `Analyze this business data and provide insights: ${JSON.stringify(dataSummary)}`
          }
        ]
      })
    });

    const aiResult = await openAIResponse.json();
    const analysis = aiResult.choices[0].message.content;

    console.log('AI Analysis completed');

    // Create audit record
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary: analysis,
        monthly_metrics: {
          revenue: dataSummary.totals.revenue,
          profit_margin: dataSummary.totals.revenue > 0 
            ? ((dataSummary.totals.revenue - dataSummary.totals.cost) / dataSummary.totals.revenue) * 100 
            : 0,
          expense_ratio: dataSummary.totals.revenue > 0 
            ? (dataSummary.totals.cost / dataSummary.totals.revenue) * 100 
            : 0,
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
            metric: "Revenue",
            value: `£${dataSummary.totals.revenue.toFixed(2)}`,
            trend: "+0%"
          },
          {
            metric: "Units Sold",
            value: dataSummary.totals.units.toString(),
            trend: "+0%"
          }
        ],
        recommendations: JSON.parse(analysis).recommendations || []
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
