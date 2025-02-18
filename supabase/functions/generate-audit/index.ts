
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get all processed spreadsheet data
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

    console.log('Found spreadsheets:', spreadsheets?.length);

    // Calculate metrics from spreadsheet data
    let totalRevenue = 0;
    let totalCost = 0;
    let transactionCount = 0;
    let totalUnits = 0;
    let averageUnitPrice = 0;
    let bestSellingSkus: Record<string, number> = {};

    if (spreadsheets && spreadsheets.length > 0) {
      for (const sheet of spreadsheets) {
        const summary = sheet.data_summary;
        if (summary) {
          totalRevenue += summary.total_revenue || 0;
          totalCost += summary.total_expenses || 0;
          transactionCount += summary.transaction_count || 0;

          // Process detailed transaction data
          if (summary.transactions) {
            for (const trans of summary.transactions) {
              if (trans.units) totalUnits += parseFloat(trans.units);
              if (trans.sku) {
                bestSellingSkus[trans.sku] = (bestSellingSkus[trans.sku] || 0) + parseFloat(trans.units || 0);
              }
            }
          }
        }
      }
    }

    // Calculate additional metrics
    averageUnitPrice = totalUnits > 0 ? totalRevenue / totalUnits : 0;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

    // Get top selling SKUs
    const topSkus = Object.entries(bestSellingSkus)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([sku, units]) => ({ sku, units }));

    console.log('Calculated metrics:', {
      totalRevenue,
      totalCost,
      transactionCount,
      profitMargin,
      topSkus
    });

    // Generate insights based on the data
    const insights = [];
    if (profitMargin < 20) {
      insights.push("Your profit margin is below 20%. Consider reviewing pricing strategy or cost optimization.");
    }
    if (topSkus.length > 0) {
      insights.push(`Your best-selling product is ${topSkus[0].sku} with ${topSkus[0].units} units sold.`);
    }
    if (averageUnitPrice > 0) {
      insights.push(`Your average unit price is £${averageUnitPrice.toFixed(2)}.`);
    }

    // Create the audit report
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: `Based on the analysis of your ${spreadsheets?.length} spreadsheet uploads, ` +
                `your business has processed ${transactionCount} transactions with ` +
                `${totalUnits} units sold. Your total revenue is £${totalRevenue.toFixed(2)} ` +
                `with a profit margin of ${profitMargin.toFixed(2)}%. ${insights.join(' ')}`,
        monthly_metrics: {
          revenue: totalRevenue,
          profit_margin: profitMargin,
          expense_ratio: expenseRatio,
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
            value: `£${totalRevenue.toFixed(2)}`,
            trend: "New baseline"
          },
          {
            metric: "Profit Margin",
            value: `${profitMargin.toFixed(2)}%`,
            trend: "New baseline"
          },
          {
            metric: "Units Sold",
            value: totalUnits.toString(),
            trend: "New baseline"
          }
        ],
        recommendations: [
          {
            title: "Sales Performance Analysis",
            description: `Your top-selling product ${topSkus[0]?.sku || 'N/A'} represents a significant portion of sales. Consider expanding this product line or applying its success factors to other products.`,
            impact: "High",
            difficulty: "Medium"
          },
          {
            title: "Profit Optimization",
            description: `With a current profit margin of ${profitMargin.toFixed(2)}%, focus on ${profitMargin < 20 ? 'improving margins through cost reduction or pricing optimization' : 'maintaining your strong margin while exploring growth opportunities'}.`,
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
