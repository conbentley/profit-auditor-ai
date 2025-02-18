
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
    let spreadsheetData = null;

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

      spreadsheetData = spreadsheet;

      if (spreadsheet.analysis_results) {
        const metrics = spreadsheet.analysis_results.financial_metrics;
        context = `I am analyzing the spreadsheet "${spreadsheet.filename}". Here are the key metrics:

Financial Overview:
- Total Revenue: ${metrics.total_revenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
- Total Cost: ${metrics.total_cost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
- Total Profit: ${metrics.total_profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
- Profit Margin: ${metrics.profit_margin.toFixed(2)}%
- Expense Ratio: ${metrics.expense_ratio.toFixed(2)}%

Data Scope:
- Total Rows Analyzed: ${spreadsheet.analysis_results.total_rows}
- File Type: ${spreadsheet.file_type.toUpperCase()}

Previous Analysis Insights:
${spreadsheet.analysis_results.ai_analysis}

I can help you understand this data better and answer specific questions about the financial performance.`;
      }
    }

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a more detailed system message
    const systemMessage = context 
      ? `You are a financial analyst assistant with expertise in business metrics and data analysis. You have access to spreadsheet data that you should use to provide detailed, accurate answers. When analyzing the data:

1. Always provide specific numbers and metrics when relevant
2. Explain trends and patterns you observe
3. Offer actionable insights and recommendations
4. Use bullet points for better readability when listing multiple points
5. If asked about something not in the data, clearly state that limitation

Current Context:
${context}`
      : `You are a financial analyst assistant. Please note that no spreadsheet data is currently loaded for analysis. I can help you understand financial concepts and guide you on what data would be helpful to analyze.`;

    // Make request to OpenAI with enhanced prompting
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
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', await response.text());
      throw new Error('Failed to get AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Log the interaction for debugging
    console.log('Query:', query);
    console.log('Context provided:', context ? 'Yes' : 'No');
    console.log('Response length:', aiResponse.length);

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "I'm having trouble analyzing this spreadsheet. Please try asking a specific question about the data, or upload the file again if the issue persists."
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
