
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatMetricTrend = (current: number, previous: number): string => {
  const percentageChange = ((current - previous) / previous) * 100;
  return percentageChange >= 0 ? `+${percentageChange.toFixed(2)}%` : `${percentageChange.toFixed(2)}%`;
};

const formatAuditContext = (audit: any) => {
  if (!audit) return "No audit data available.";

  const metrics = audit.monthly_metrics;
  const trends = {
    revenue: formatMetricTrend(metrics.revenue, metrics.previous_month.revenue),
    profit_margin: formatMetricTrend(metrics.profit_margin, metrics.previous_month.profit_margin),
    expense_ratio: formatMetricTrend(metrics.expense_ratio, metrics.previous_month.expense_ratio),
  };

  return `
Latest Financial Audit Summary (${audit.audit_date}):

Key Metrics:
- Revenue: £${metrics.revenue.toLocaleString()} (${trends.revenue} from previous month)
- Profit Margin: ${metrics.profit_margin.toFixed(2)}% (${trends.profit_margin} from previous month)
- Expense Ratio: ${metrics.expense_ratio.toFixed(2)}% (${trends.expense_ratio} from previous month)

Summary: ${audit.summary}

KPIs:
${audit.kpis.map((kpi: any) => `- ${kpi.metric}: ${kpi.value}${kpi.trend ? ` (${kpi.trend})` : ''}`).join('\n')}

Key Recommendations:
${audit.recommendations.map((rec: any) => `- ${rec.title} (Impact: ${rec.impact}, Difficulty: ${rec.difficulty})`).join('\n')}
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, auditContext } = await req.json();
    const formattedAuditContext = formatAuditContext(auditContext);

    const systemPrompt = `You are an AI financial advisor for the Profit Auditor platform. You have access to the latest financial audit data and metrics. Your role is to:
1. Analyze financial trends and patterns
2. Provide detailed explanations of metrics and their implications
3. Suggest actionable improvements based on the data
4. Answer questions about the financial performance
5. Help interpret the recommendations and their potential impact

Current Audit Context:
${formattedAuditContext}

When answering:
- Be specific and reference actual numbers from the audit
- Explain trends and their implications
- Connect different metrics to provide deeper insights
- Provide actionable advice based on the data
- Use clear, professional language
- Format currency values in GBP (£)`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to get AI response');
    }

    return new Response(
      JSON.stringify({ response: data.choices[0].message.content }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error in chat-with-audit function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
