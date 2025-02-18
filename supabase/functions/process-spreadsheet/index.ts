
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the uploaded file details
    const { data: upload, error: uploadError } = await supabaseClient
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError) throw uploadError;
    if (!upload) throw new Error('Upload not found');

    // Download the file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (fileError) throw fileError;

    // Convert the file to text
    const text = await fileData.text();
    const rows = text.split('\n').map(row => row.split(','));

    // Basic analysis
    const headers = rows[0];
    const dataRows = rows.slice(1);

    let totalRevenue = 0;
    let totalCost = 0;
    let revenueIndex = headers.findIndex(h => h.toLowerCase().includes('revenue'));
    let costIndex = headers.findIndex(h => h.toLowerCase().includes('cost'));

    dataRows.forEach(row => {
      if (revenueIndex >= 0) {
        totalRevenue += parseFloat(row[revenueIndex]) || 0;
      }
      if (costIndex >= 0) {
        totalCost += parseFloat(row[costIndex]) || 0;
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    // Generate AI analysis
    const analysisPrompt = `Analyze this financial data:
    Total Revenue: ${totalRevenue}
    Total Cost: ${totalCost}
    Profit Margin: ${profitMargin}%
    Expense Ratio: ${expenseRatio}%
    
    Provide insights and recommendations.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a financial analyst providing insights on spreadsheet data.' },
          { role: 'user', content: analysisPrompt }
        ],
      }),
    });

    const aiData = await openAIResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    // Update the spreadsheet_uploads table with analysis results
    const analysisResults = {
      total_rows: dataRows.length,
      financial_metrics: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin: profitMargin,
        expense_ratio: expenseRatio,
      },
      ai_analysis: aiAnalysis,
      processed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseClient
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysisResults,
      })
      .eq('id', uploadId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: 'Spreadsheet processed successfully', analysisResults }),
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
