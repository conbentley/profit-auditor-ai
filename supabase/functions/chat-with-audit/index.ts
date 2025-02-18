
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, spreadsheetId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let context = "";

    // If spreadsheetId is provided, get the spreadsheet data
    if (spreadsheetId) {
      const { data: spreadsheet, error: spreadsheetError } = await supabase
        .from('spreadsheet_uploads')
        .select('*')
        .eq('id', spreadsheetId)
        .single();

      if (spreadsheetError) {
        throw new Error('Failed to fetch spreadsheet data');
      }

      if (spreadsheet.analysis_results) {
        context = `Based on the spreadsheet analysis:
        Total Rows: ${spreadsheet.analysis_results.total_rows}
        Financial Metrics:
        - Total Revenue: ${spreadsheet.analysis_results.financial_metrics.total_revenue}
        - Total Cost: ${spreadsheet.analysis_results.financial_metrics.total_cost}
        - Total Profit: ${spreadsheet.analysis_results.financial_metrics.total_profit}
        - Profit Margin: ${spreadsheet.analysis_results.financial_metrics.profit_margin}%
        - Expense Ratio: ${spreadsheet.analysis_results.financial_metrics.expense_ratio}%
        
        Previous AI Analysis: ${spreadsheet.analysis_results.ai_analysis}`;
      }
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare system message based on context
    const systemMessage = context 
      ? `You are a financial analyst assistant. Use the following context about the uploaded spreadsheet to answer questions: ${context}`
      : 'You are a financial analyst assistant. Please note that no spreadsheet data is currently loaded for analysis.';

    // Make request to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: systemMessage
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
