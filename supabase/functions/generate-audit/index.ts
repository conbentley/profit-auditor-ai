
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

    // Get spreadsheets that haven't been processed yet
    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id)
      .eq('processed', false)
      .order('uploaded_at', { ascending: true });

    if (spreadsheetsError) throw spreadsheetsError;
    if (!spreadsheets?.length) {
      return new Response(
        JSON.stringify({ error: 'No new spreadsheets found to analyze' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Found ${spreadsheets.length} unprocessed spreadsheets`);

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
        console.log('Sample data:', jsonData[0]);
        
        combinedData = combinedData.concat(jsonData);

        // Mark spreadsheet as processed
        await supabase
          .from('spreadsheet_uploads')
          .update({ processed: true, analyzed_at: new Date().toISOString() })
          .eq('id', sheet.id);

      } catch (error) {
        console.error(`Error processing ${sheet.filename}:`, error);
        await supabase
          .from('spreadsheet_uploads')
          .update({ 
            processing_error: error.message,
            analyzed_at: new Date().toISOString()
          })
          .eq('id', sheet.id);
      }
    }

    if (combinedData.length === 0) {
      throw new Error('No valid data found in spreadsheets');
    }

    console.log(`Total combined rows: ${combinedData.length}`);

    // Prepare data summary for OpenAI
    const dataSummary = {
      totalRows: combinedData.length,
      columns: Object.keys(combinedData[0] || {}),
      sampleData: combinedData.slice(0, 5),
      totals: combinedData.reduce((acc, row) => {
        // Handle different possible column names
        const revenue = Number(row['Revenue'] || row['Total Revenue (£)'] || row['Sale Price (£)'] || 0);
        const cost = Number(row['Cost'] || row['Total Cost (£)'] || row['COGS (£)'] || 0);
        const units = Number(row['Units Sold'] || row['Quantity'] || 0);
        
        return {
          revenue: acc.revenue + revenue,
          cost: acc.cost + cost,
          units: acc.units + units
        };
      }, { revenue: 0, cost: 0, units: 0 })
    };

    console.log('Data summary:', JSON.stringify(dataSummary, null, 2));

    // Get AI analysis
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst AI. Analyze the business data and provide insights in the following JSON format ONLY:
            {
              "summary": "Brief overview of the financial situation",
              "monthly_metrics": {
                "revenue": number,
                "profit_margin": number,
                "expense_ratio": number,
                "audit_alerts": number,
                "previous_month": {
                  "revenue": number,
                  "profit_margin": number,
                  "expense_ratio": number,
                  "audit_alerts": number
                }
              },
              "kpis": [
                {
                  "metric": "string",
                  "value": "string",
                  "trend": "string"
                }
              ],
              "recommendations": [
                {
                  "title": "string",
                  "description": "string",
                  "impact": "High/Medium/Low",
                  "difficulty": "Easy/Medium/Hard"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze this business data and provide insights in the specified JSON format: ${JSON.stringify(dataSummary)}`
          }
        ]
      })
    });

    const aiResult = await openAIResponse.json();
    console.log('AI Response:', aiResult.choices[0].message.content);
    
    // Parse the AI response
    const analysis = JSON.parse(aiResult.choices[0].message.content.trim());

    // Create audit record
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary: analysis.summary,
        monthly_metrics: analysis.monthly_metrics,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations
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
