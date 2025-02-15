
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

interface AuditFinding {
  category: 'subscription' | 'pricing' | 'tax' | 'marketing' | 'inventory';
  severity: 'critical' | 'medium' | 'low';
  title: string;
  description: string;
  potential_savings: number;
  resolution_steps: Record<string, any>;
}

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
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const profit_margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    // Calculate cost breakdown by category
    const cost_breakdown = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Uncategorized';
        acc[category] = (acc[category] || 0) + Number(t.amount);
        return acc;
      }, {} as Record<string, number>);

    const financialData: FinancialMetrics = {
      revenue,
      expenses,
      profit_margin,
      cost_breakdown
    };

    // Fetch competitor prices for comparison
    const { data: competitorPrices } = await supabase
      .from('competitor_prices')
      .select('*')
      .eq('user_id', user_id);

    // Fetch marketing performance data
    const { data: marketingData } = await supabase
      .from('marketing_performance')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    // Generate AI analysis with enhanced context
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
            content: `You are an expert financial analyst AI that identifies profit leaks and provides actionable recommendations. 
            Focus on these key areas:
            1. Subscription optimization
            2. Pricing strategy vs competitors
            3. Tax efficiency
            4. Marketing ROI
            5. Inventory management
            
            For each finding, provide specific, quantified savings estimates and clear step-by-step resolution steps.`
          },
          {
            role: 'user',
            content: `Analyze these financial metrics and provide detailed insights:
              Financial Data: ${JSON.stringify(financialData)}
              Competitor Prices: ${JSON.stringify(competitorPrices)}
              Marketing Performance: ${JSON.stringify(marketingData)}
              
              Provide a comprehensive analysis including:
              1. Key performance indicators and their trends
              2. Specific profit leaks identified
              3. Prioritized recommendations with estimated savings
              4. Industry benchmarking insights
              
              Format the response as JSON with these keys:
              {
                summary: string,
                kpis: [{ metric: string, value: string, trend: string }],
                findings: [{ 
                  category: string,
                  severity: string,
                  title: string,
                  description: string,
                  potential_savings: number,
                  resolution_steps: object
                }],
                recommendations: [{ 
                  title: string,
                  description: string,
                  impact: string,
                  difficulty: string,
                  estimated_savings: number
                }]
              }`
          }
        ],
      }),
    });

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Store audit results
    const { data: audit, error: insertError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: analysis.summary,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations,
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

    // Store individual findings
    if (analysis.findings) {
      const findings = analysis.findings.map((finding: AuditFinding) => ({
        user_id,
        audit_id: audit.id,
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description,
        potential_savings: finding.potential_savings,
        resolution_steps: finding.resolution_steps,
        status: 'pending'
      }));

      const { error: findingsError } = await supabase
        .from('audit_findings')
        .insert(findings);

      if (findingsError) throw findingsError;
    }

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
