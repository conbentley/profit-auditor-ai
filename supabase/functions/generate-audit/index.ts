
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, month, year } = await req.json()
    console.log('Generating audit for:', { user_id, month, year });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // First, get all processed spreadsheet data
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
    let totalExpenses = 0;
    let transactionCount = 0;

    if (spreadsheets && spreadsheets.length > 0) {
      for (const sheet of spreadsheets) {
        const data = sheet.data_summary;
        if (data) {
          totalRevenue += data.total_revenue || 0;
          totalExpenses += data.total_expenses || 0;
          transactionCount += data.transaction_count || 0;
        }
      }
    }

    console.log('Calculated metrics:', { totalRevenue, totalExpenses, transactionCount });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // Create the audit report
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: `Based on the analysis of your ${spreadsheets?.length} spreadsheet uploads, ` +
                `your business has processed ${transactionCount} transactions. ` +
                `Your total revenue is ${totalRevenue} with a profit margin of ${profitMargin.toFixed(2)}%.`,
        monthly_metrics: {
          revenue: totalRevenue,
          profit_margin: profitMargin,
          expense_ratio: expenseRatio,
          audit_alerts: 0,
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
            value: `$${totalRevenue.toFixed(2)}`,
            trend: "+0% vs last month"
          },
          {
            metric: "Profit Margin",
            value: `${profitMargin.toFixed(2)}%`,
            trend: "+0% vs last month"
          },
          {
            metric: "Expense Ratio",
            value: `${expenseRatio.toFixed(2)}%`,
            trend: "+0% vs last month"
          }
        ],
        recommendations: [
          {
            title: "Initial Financial Analysis",
            description: `Based on your current expense ratio of ${expenseRatio.toFixed(2)}%, ` +
                        `consider reviewing your operational costs for optimization opportunities.`,
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

    console.log('Audit generated successfully:', auditData);

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully', data: auditData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
