
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinancialMetrics {
  revenue: number;
  expenses: number;
  profit_margin: number;
  cost_breakdown: Record<string, number>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year } = await req.json();

    // Fetch financial data from integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from('financial_integrations')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (integrationsError) throw integrationsError;

    // For demo purposes, we'll use mock data
    // In a real app, you would fetch this from the accounting software API
    const mockFinancialData: FinancialMetrics = {
      revenue: 150000,
      expenses: 95000,
      profit_margin: 36.67,
      cost_breakdown: {
        'Labor': 45000,
        'Materials': 25000,
        'Marketing': 15000,
        'Operations': 10000,
      }
    };

    // Generate AI analysis
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
            content: 'You are a financial analyst AI that provides detailed business insights and recommendations.'
          },
          {
            role: 'user',
            content: `Analyze these financial metrics and provide insights and recommendations:
              Revenue: ${mockFinancialData.revenue}
              Expenses: ${mockFinancialData.expenses}
              Profit Margin: ${mockFinancialData.profit_margin}%
              Cost Breakdown: ${JSON.stringify(mockFinancialData.cost_breakdown)}
              
              Provide a detailed analysis including:
              1. Summary of key performance indicators
              2. Areas of concern or opportunity
              3. Specific, actionable recommendations
              4. Industry benchmarking insights
              
              Format the response as JSON with these keys:
              {
                summary: string,
                kpis: { metric: string, value: string, trend: string }[],
                recommendations: { title: string, description: string, impact: string, difficulty: string }[]
              }`
          }
        ],
      }),
    });

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Store audit results
    const { error: insertError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: analysis.summary,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations,
        analysis_metadata: {
          data_source: 'mock_data',
          ai_model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
        }
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating audit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
