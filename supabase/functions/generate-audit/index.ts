
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year } = await req.json();

    // Fetch financial data from transactions
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const { data: transactions, error: transactionsError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());

    if (transactionsError) throw transactionsError;

    // Calculate financial metrics
    const revenue = transactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const expenses = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const profit_margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    // Calculate cost breakdown by category
    const cost_breakdown = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>) ?? {};

    // Fetch additional data for enhanced recommendations
    const { data: marketingData } = await supabase
      .from('marketing_performance')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    const { data: competitorPrices } = await supabase
      .from('competitor_prices')
      .select('*')
      .eq('user_id', user_id);

    const { data: products } = await supabase
      .from('ecommerce_products')
      .select('*')
      .eq('user_id', user_id);

    const financialData = {
      revenue,
      expenses,
      profit_margin,
      cost_breakdown,
      marketing_performance: marketingData || [],
      competitor_prices: competitorPrices || [],
      inventory: products || []
    };

    // Generate AI analysis with enhanced focus areas
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
            content: `You are an advanced financial analyst AI specializing in business optimization. 
            Focus on three key areas:
            1. Dynamic Pricing Strategy: Analyze competitor prices and market trends
            2. Marketing ROI Optimization: Evaluate marketing spend effectiveness
            3. Inventory Management: Identify opportunities to optimize stock levels
            
            Return ONLY a JSON object with this exact structure:
            {
              "summary": "Executive summary of findings",
              "kpis": [
                {"metric": "string", "value": "string", "trend": "string"}
              ],
              "recommendations": [
                {
                  "title": "string",
                  "description": "string",
                  "impact": "High/Medium/Low",
                  "difficulty": "Easy/Medium/Hard",
                  "category": "Pricing/Marketing/Inventory"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze these business metrics and provide specific recommendations: ${JSON.stringify(financialData)}`
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('OpenAI response:', aiResponse.choices[0].message.content);

    // Parse the response, ensuring it's valid JSON
    let analysis;
    try {
      analysis = JSON.parse(aiResponse.choices[0].message.content.trim());
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid response format from AI service');
    }

    // Validate required fields
    if (!analysis.summary || !Array.isArray(analysis.kpis) || !Array.isArray(analysis.recommendations)) {
      throw new Error('Invalid response structure from AI service');
    }

    // Store audit results
    const { data: audit, error: insertError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: analysis.summary,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations,
        monthly_metrics: {
          revenue,
          profit_margin,
          expense_ratio: expenses > 0 ? (expenses / revenue) * 100 : 0,
          audit_alerts: analysis.recommendations.length,
          previous_month: {
            revenue: 0,
            profit_margin: 0,
            expense_ratio: 0,
            audit_alerts: 0
          }
        },
        analysis_metadata: {
          data_source: 'transactions',
          ai_model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          metrics: financialData
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, audit: audit }),
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
