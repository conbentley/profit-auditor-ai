
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const formatMetricTrend = (current: number | null | undefined, previous: number | null | undefined): string => {
  // Handle null/undefined values
  if (current == null || previous == null || previous === 0) {
    return "N/A";
  }
  
  const percentageChange = ((current - previous) / previous) * 100;
  return percentageChange >= 0 ? `+${percentageChange.toFixed(2)}%` : `${percentageChange.toFixed(2)}%`;
};

const formatNumber = (num: number | null | undefined): string => {
  if (num == null) return "N/A";
  return num.toLocaleString();
};

const formatPercentage = (num: number | null | undefined): string => {
  if (num == null) return "N/A";
  return `${num.toFixed(2)}%`;
};

const formatAuditContext = (audit: any) => {
  if (!audit) return "No audit data available.";

  try {
    const metrics = audit.monthly_metrics || {};
    const previousMetrics = metrics.previous_month || {};
    
    // Safely access metrics with fallbacks
    const trends = {
      revenue: formatMetricTrend(
        Number(metrics.revenue || 0),
        Number(previousMetrics.revenue || 0)
      ),
      profit_margin: formatMetricTrend(
        Number(metrics.profit_margin || 0),
        Number(previousMetrics.profit_margin || 0)
      ),
      expense_ratio: formatMetricTrend(
        Number(metrics.expense_ratio || 0),
        Number(previousMetrics.expense_ratio || 0)
      ),
    };

    return `
Latest Financial Audit Summary (${audit.audit_date || 'Date not available'}):

Key Metrics:
- Revenue: £${formatNumber(Number(metrics.revenue || 0))} (${trends.revenue} from previous month)
- Profit Margin: ${formatPercentage(Number(metrics.profit_margin || 0))} (${trends.profit_margin} from previous month)
- Expense Ratio: ${formatPercentage(Number(metrics.expense_ratio || 0))} (${trends.expense_ratio} from previous month)

Summary: ${audit.summary || 'No summary available'}

KPIs:
${Array.isArray(audit.kpis) ? audit.kpis.map((kpi: any) => 
  `- ${kpi.metric || 'Unknown metric'}: ${kpi.value || 'N/A'}${kpi.trend ? ` (${kpi.trend})` : ''}`
).join('\n') : 'No KPIs available'}

Key Recommendations:
${Array.isArray(audit.recommendations) ? audit.recommendations.map((rec: any) => 
  `- ${rec.title || 'Untitled'} (Impact: ${rec.impact || 'Unknown'}, Difficulty: ${rec.difficulty || 'Unknown'})`
).join('\n') : 'No recommendations available'}
`;
  } catch (error) {
    console.error('Error formatting audit context:', error);
    return "Error formatting audit data. Please check the data structure.";
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, auditContext } = await req.json();
    console.log('Received audit context:', JSON.stringify(auditContext, null, 2));
    
    const formattedAuditContext = formatAuditContext(auditContext);
    console.log('Formatted audit context:', formattedAuditContext);

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
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
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
