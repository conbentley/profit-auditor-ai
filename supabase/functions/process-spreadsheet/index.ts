
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    if (!uploadId) {
      throw new Error('No upload ID provided');
    }

    console.log('Processing upload ID:', uploadId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the upload record
    const { data: upload, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      console.error('Upload not found:', uploadError);
      throw new Error('Upload not found');
    }

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (fileError || !fileData) {
      console.error('File not found in storage:', fileError);
      throw new Error('File not found in storage');
    }

    // Process the file data in smaller chunks
    const text = await fileData.text();
    const rows = text.split('\n').slice(0, 1000); // Limit to first 1000 rows for processing
    const headers = rows[0].split(',');
    const data = rows.slice(1).map(row => 
      Object.fromEntries(headers.map((header, i) => [header, row.split(',')[i]]))
    );

    // Calculate basic financial metrics
    const financialMetrics = {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin: 0,
      expense_ratio: 0,
    };

    // Find revenue and cost columns
    const revenueColumn = headers.find(h => 
      h.toLowerCase().includes('revenue') || 
      h.toLowerCase().includes('sales') || 
      h.toLowerCase().includes('income')
    );
    const costColumn = headers.find(h => 
      h.toLowerCase().includes('cost') || 
      h.toLowerCase().includes('expense') || 
      h.toLowerCase().includes('expenditure')
    );

    if (revenueColumn && costColumn) {
      data.forEach(row => {
        const revenue = parseFloat(row[revenueColumn]) || 0;
        const cost = parseFloat(row[costColumn]) || 0;
        financialMetrics.total_revenue += revenue;
        financialMetrics.total_cost += cost;
      });

      financialMetrics.total_profit = financialMetrics.total_revenue - financialMetrics.total_cost;
      financialMetrics.profit_margin = (financialMetrics.total_profit / financialMetrics.total_revenue) * 100;
      financialMetrics.expense_ratio = (financialMetrics.total_cost / financialMetrics.total_revenue) * 100;
    }

    console.log('Calculated financial metrics:', financialMetrics);

    // Generate AI analysis
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this financial data summary:
    Total Revenue: ${financialMetrics.total_revenue}
    Total Cost: ${financialMetrics.total_cost}
    Profit Margin: ${financialMetrics.profit_margin}%
    Expense Ratio: ${financialMetrics.expense_ratio}%
    
    Provide a brief, clear analysis of the financial performance including key insights and any potential areas for improvement.`;

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
            content: 'You are a financial analyst providing concise, actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      console.error('OpenAI API error:', await aiResponse.text());
      throw new Error('OpenAI API request failed');
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0].message.content;

    console.log('Generated AI analysis');

    // Update the upload record with analysis results
    const { error: updateError } = await supabase
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: {
          total_rows: rows.length - 1,
          financial_metrics: financialMetrics,
          ai_analysis: analysis,
          processed_at: new Date().toISOString()
        }
      })
      .eq('id', uploadId);

    if (updateError) {
      console.error('Error updating upload record:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: {
          total_rows: rows.length - 1,
          financial_metrics: financialMetrics,
          ai_analysis: analysis,
          processed_at: new Date().toISOString()
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error processing spreadsheet' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
