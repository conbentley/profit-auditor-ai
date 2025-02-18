
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
    const { user_id, spreadsheet_data } = await req.json();

    if (!user_id || !spreadsheet_data) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Aggregate metrics from all spreadsheets
    let totalRevenue = 0;
    let totalExpenses = 0;
    const insights = [];
    const kpis = [];

    spreadsheet_data.forEach(sheet => {
      const results = sheet.analysis_results;
      if (results) {
        totalRevenue += Number(results.total_revenue) || 0;
        totalExpenses += Number(results.total_expenses) || 0;
        
        if (results.insights) {
          insights.push(`From ${sheet.filename}:`);
          insights.push(...results.insights);
        }
      }
    });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // Generate comprehensive analysis
    const summary = `Analysis of ${spreadsheet_data.length} financial documents completed. ` +
      `Total revenue across all documents: ${totalRevenue.toFixed(2)}. ` +
      `Overall profit margin: ${profitMargin.toFixed(2)}%.`;

    // Create audit record
    const { error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary,
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
            metric: "Total Revenue",
            value: totalRevenue.toFixed(2),
            trend: "current"
          },
          {
            metric: "Profit Margin",
            value: `${profitMargin.toFixed(2)}%`,
            trend: "current"
          },
          {
            metric: "Expense Ratio",
            value: `${expenseRatio.toFixed(2)}%`,
            trend: "current"
          }
        ],
        recommendations: [
          {
            title: "Comprehensive Financial Analysis",
            description: `Analysis based on ${spreadsheet_data.length} documents. Overall profit margin is ${profitMargin.toFixed(2)}%.`,
            impact: "High",
            difficulty: "Low"
          },
          {
            title: "Expense Management",
            description: `Current expense ratio is ${expenseRatio.toFixed(2)}%. Consider reviewing major expense categories.`,
            impact: "Medium",
            difficulty: "Medium"
          }
        ]
      });

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ success: true }),
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
