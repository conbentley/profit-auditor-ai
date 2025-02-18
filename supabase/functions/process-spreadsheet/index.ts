
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing spreadsheet:', uploadId);

    // Get the spreadsheet upload record
    const { data: upload, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError) throw new Error('Failed to fetch upload record');

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError) throw new Error('Failed to download file');

    // Read the spreadsheet data
    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // Get the first worksheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log('Rows processed:', jsonData.length);

    // Initialize metrics
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;

    // Process the data and calculate metrics
    jsonData.forEach((row: any) => {
      const sales = parseFloat(row['Sales'] || row['sales'] || '0');
      const profit = parseFloat(row['Profit'] || row['profit'] || '0');
      const cost = sales - profit;

      totalRevenue += sales;
      totalCost += cost;
      totalProfit += profit;
    });

    // Calculate financial ratios
    const profitMargin = (totalProfit / totalRevenue) * 100;
    const expenseRatio = (totalCost / totalRevenue) * 100;

    // Generate AI analysis of the data
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OpenAI API key not configured');

    const metricsPrompt = `
      Analyze these financial metrics from a spreadsheet:
      - Total Revenue: $${totalRevenue.toFixed(2)}
      - Total Cost: $${totalCost.toFixed(2)}
      - Total Profit: $${totalProfit.toFixed(2)}
      - Profit Margin: ${profitMargin.toFixed(2)}%
      - Expense Ratio: ${expenseRatio.toFixed(2)}%
      - Number of Records: ${jsonData.length}

      Provide a concise analysis of the business performance based on these metrics.
      Include key observations and any potential areas for improvement.
      Format the response in clear paragraphs with the most important insights first.
    `;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. Provide clear, actionable insights based on the data provided.'
          },
          {
            role: 'user',
            content: metricsPrompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) throw new Error('Failed to get AI analysis');

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    // Update the spreadsheet record with analysis results
    const analysisResults = {
      total_rows: jsonData.length,
      financial_metrics: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin: profitMargin,
        expense_ratio: expenseRatio
      },
      ai_analysis: aiAnalysis,
      processed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabase
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysisResults,
        row_count: jsonData.length
      })
      .eq('id', uploadId);

    if (updateError) throw new Error('Failed to update analysis results');

    return new Response(
      JSON.stringify({ success: true, analysis: analysisResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "Failed to process the spreadsheet. Please ensure the file contains valid data with Sales and Profit columns."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
