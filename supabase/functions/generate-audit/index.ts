
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body and add validation
    const requestData = await req.json();
    const { user_id, month, year } = requestData;
    
    console.log('Generating audit for:', { user_id, month, year });

    if (!user_id) {
      throw new Error('User ID is required');
    }

    const currentDate = new Date();
    const auditMonth = month || currentDate.getMonth() + 1;
    const auditYear = year || currentDate.getFullYear();

    // Format dates for query
    const startDate = `${auditYear}-${auditMonth.toString().padStart(2, '0')}-01`;
    const endDate = `${auditYear}-${auditMonth.toString().padStart(2, '0')}-${new Date(auditYear, auditMonth, 0).getDate()}`;

    // Fetch financial transactions for the period
    const { data: transactions, error: transactionError } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    if (transactionError) throw transactionError;

    console.log(`Found ${transactions?.length || 0} transactions for period`);

    // Calculate metrics
    const revenue = transactions
      ?.filter(t => t.type === 'income')
      ?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const expenses = transactions
      ?.filter(t => t.type === 'expense')
      ?.reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const profit = revenue - expenses;
    const profit_margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const expense_ratio = revenue > 0 ? (expenses / revenue) * 100 : 0;

    // Get previous month's data
    const previousMonth = auditMonth === 1 ? 12 : auditMonth - 1;
    const previousYear = auditMonth === 1 ? auditYear - 1 : auditYear;
    
    const { data: previousAudit } = await supabase
      .from('financial_audits')
      .select('monthly_metrics')
      .eq('user_id', user_id)
      .eq('audit_date', `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`)
      .maybeSingle();

    // Count audit alerts
    let audit_alerts = 0;
    if (expense_ratio > 70) audit_alerts++;
    if (profit_margin < 10) audit_alerts++;
    if (!transactions || transactions.length === 0) audit_alerts++;

    // Prepare monthly metrics
    const monthly_metrics = {
      revenue,
      profit_margin,
      expense_ratio,
      audit_alerts,
      previous_month: previousAudit?.monthly_metrics ?? {
        revenue: 0,
        profit_margin: 0,
        expense_ratio: 0,
        audit_alerts: 0
      }
    };

    // Generate KPIs
    const kpis = [
      {
        metric: "Revenue",
        value: revenue.toFixed(2),
        trend: calculateTrend(revenue, monthly_metrics.previous_month.revenue)
      },
      {
        metric: "Profit Margin",
        value: `${profit_margin.toFixed(1)}%`,
        trend: calculateTrend(profit_margin, monthly_metrics.previous_month.profit_margin)
      },
      {
        metric: "Expense Ratio",
        value: `${expense_ratio.toFixed(1)}%`,
        trend: calculateTrend(expense_ratio, monthly_metrics.previous_month.expense_ratio)
      }
    ];

    // Generate recommendations
    const recommendations = generateRecommendations(monthly_metrics, transactions || []);

    // Generate summary
    const summary = generateSummary(monthly_metrics, kpis, recommendations);

    // Save audit to database
    const { error: insertError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: startDate,
        monthly_metrics,
        kpis,
        recommendations,
        summary
      });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        message: 'Audit generated successfully',
        summary 
      }),
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

function calculateTrend(current: number, previous: number): string {
  if (previous === 0) return "N/A";
  const percentageChange = ((current - previous) / previous) * 100;
  return `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;
}

function generateRecommendations(metrics: any, transactions: any[]): any[] {
  const recommendations = [];

  if (metrics.expense_ratio > 70) {
    recommendations.push({
      title: "High Expense Ratio Alert",
      description: "Your expense ratio is above 70%, which may impact profitability. Consider reviewing major expense categories for potential cost reductions.",
      impact: "High",
      difficulty: "Medium"
    });
  }

  if (metrics.profit_margin < 10) {
    recommendations.push({
      title: "Low Profit Margin Alert",
      description: "Your profit margin is below 10%. Consider strategies to increase revenue or reduce costs to improve profitability.",
      impact: "High",
      difficulty: "Medium"
    });
  }

  if (transactions.length === 0) {
    recommendations.push({
      title: "Missing Transaction Data",
      description: "No transactions were recorded for this period. Ensure all financial data is properly tracked and recorded.",
      impact: "High",
      difficulty: "Low"
    });
  }

  return recommendations;
}

function generateSummary(metrics: any, kpis: any[], recommendations: any[]): string {
  const revenueChange = calculateTrend(metrics.revenue, metrics.previous_month.revenue);
  const profitMarginChange = calculateTrend(metrics.profit_margin, metrics.previous_month.profit_margin);

  let summary = `Financial analysis for the period shows `;

  if (metrics.revenue > metrics.previous_month.revenue) {
    summary += `revenue growth of ${revenueChange} compared to last month. `;
  } else {
    summary += `a revenue decrease of ${revenueChange} compared to last month. `;
  }

  if (metrics.profit_margin > metrics.previous_month.profit_margin) {
    summary += `Profit margin has improved by ${profitMarginChange}. `;
  } else {
    summary += `Profit margin has declined by ${profitMarginChange}. `;
  }

  if (recommendations.length > 0) {
    summary += `Key areas requiring attention include ${recommendations.map(r => r.title.toLowerCase()).join(', ')}. `;
  }

  return summary.trim();
}
