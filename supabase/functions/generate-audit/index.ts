
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateInsights(metrics: any) {
  const insights = [];
  
  if (metrics.profitMargin < 20) {
    insights.push(`Your profit margin of ${metrics.profitMargin.toFixed(1)}% is below the recommended 20%. Consider reviewing pricing strategy or reducing costs.`);
  } else {
    insights.push(`Your healthy profit margin of ${metrics.profitMargin.toFixed(1)}% indicates good business performance.`);
  }

  if (metrics.totalUnits > 0) {
    const avgRevenuePerUnit = metrics.totalRevenue / metrics.totalUnits;
    insights.push(`Average revenue per unit is £${avgRevenuePerUnit.toFixed(2)}.`);
  }

  if (metrics.expenseRatio > 80) {
    insights.push(`Your expense ratio of ${metrics.expenseRatio.toFixed(1)}% is high. Focus on cost reduction.`);
  }

  return insights;
}

function formatCurrency(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year } = await req.json();
    console.log('Generating audit for:', { user_id, month, year });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: spreadsheets, error: spreadsheetsError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id)
      .eq('processed', true)
      .is('processing_error', null);

    if (spreadsheetsError) {
      console.error('Error fetching spreadsheets:', spreadsheetsError);
      throw spreadsheetsError;
    }

    console.log('Processing spreadsheets:', spreadsheets?.length);

    // Aggregate all metrics
    const metrics = {
      totalRevenue: 0,
      totalCost: 0,
      totalUnits: 0,
      transactionCount: 0,
      profitMargin: 0,
      expenseRatio: 0,
      topProducts: new Map()
    };

    if (spreadsheets && spreadsheets.length > 0) {
      spreadsheets.forEach(sheet => {
        const summary = sheet.data_summary;
        if (summary) {
          metrics.totalRevenue += summary.total_revenue || 0;
          metrics.totalCost += summary.total_expenses || 0;
          metrics.transactionCount += summary.transaction_count || 0;
          metrics.totalUnits += summary.total_units || 0;

          // Process transaction-level data
          if (summary.transactions) {
            summary.transactions.forEach((trans: any) => {
              if (trans.sku || trans.product_id || trans.item) {
                const productId = trans.sku || trans.product_id || trans.item;
                const currentCount = metrics.topProducts.get(productId) || 0;
                metrics.topProducts.set(productId, currentCount + (trans.units || 1));
              }
            });
          }
        }
      });
    }

    // Calculate derived metrics
    metrics.profitMargin = metrics.totalRevenue > 0 
      ? ((metrics.totalRevenue - metrics.totalCost) / metrics.totalRevenue) * 100 
      : 0;
    
    metrics.expenseRatio = metrics.totalRevenue > 0 
      ? (metrics.totalCost / metrics.totalRevenue) * 100 
      : 0;

    // Get top products
    const topProducts = Array.from(metrics.topProducts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    const insights = generateInsights(metrics);
    
    console.log('Calculated metrics:', {
      revenue: metrics.totalRevenue,
      cost: metrics.totalCost,
      transactions: metrics.transactionCount,
      units: metrics.totalUnits,
      margin: metrics.profitMargin
    });

    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: `Analysis of ${spreadsheets?.length} uploads shows ${metrics.transactionCount} transactions and ${metrics.totalUnits} units sold. Revenue: ${formatCurrency(metrics.totalRevenue)} with ${metrics.profitMargin.toFixed(1)}% profit margin. ${insights[0]}`,
        monthly_metrics: {
          revenue: metrics.totalRevenue,
          profit_margin: metrics.profitMargin,
          expense_ratio: metrics.expenseRatio,
          audit_alerts: insights.length,
          previous_month: {
            revenue: 0,
            profit_margin: 0,
            expense_ratio: 0,
            audit_alerts: 0
          }
        },
        kpis: [
          {
            metric: "Revenue",
            value: formatCurrency(metrics.totalRevenue),
            trend: "Current period"
          },
          {
            metric: "Profit Margin",
            value: `${metrics.profitMargin.toFixed(1)}%`,
            trend: "Current period"
          },
          {
            metric: "Units Sold",
            value: metrics.totalUnits.toString(),
            trend: "Current period"
          }
        ],
        recommendations: [
          {
            title: "Business Performance",
            description: insights.join(' '),
            impact: "High",
            difficulty: "Medium"
          },
          {
            title: "Product Analysis",
            description: topProducts.length > 0 
              ? `Your top product ${topProducts[0][0]} accounts for ${topProducts[0][1]} units. Consider expanding this product line.`
              : `Consider tracking product-specific performance to identify top sellers.`,
            impact: "High",
            difficulty: "Medium"
          }
        ]
      })
      .select()
      .single();

    if (auditError) {
      console.error('Error creating audit:', auditError);
      throw auditError;
    }

    console.log('Audit generated successfully:', auditData?.id);

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully', data: auditData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
