
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
    console.log('Processing audit for user:', user_id);

    if (!user_id || !spreadsheet_data) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, clean up any existing audit data
    const { error: cleanupError } = await supabase
      .from('financial_audits')
      .delete()
      .eq('user_id', user_id);

    if (cleanupError) {
      console.error('Error cleaning up old audits:', cleanupError);
      throw cleanupError;
    }

    // Verify these spreadsheets still exist and belong to the user
    const { data: activeUploads, error: verifyError } = await supabase
      .from('spreadsheet_uploads')
      .select('id')
      .eq('user_id', user_id)
      .in('id', spreadsheet_data.map(sheet => sheet.id));

    if (verifyError) {
      console.error('Error verifying uploads:', verifyError);
      throw verifyError;
    }

    const activeUploadIds = new Set(activeUploads.map(upload => upload.id));
    const validSpreadsheetData = spreadsheet_data.filter(sheet => activeUploadIds.has(sheet.id));

    console.log(`Found ${validSpreadsheetData.length} active uploads out of ${spreadsheet_data.length} total`);

    if (validSpreadsheetData.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active spreadsheets found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize metrics
    let totalRevenue = 0;
    let totalExpenses = 0;
    let insights = [];
    let processedFiles = 0;

    // Process only verified active spreadsheets
    validSpreadsheetData.forEach(sheet => {
      console.log(`Processing verified sheet: ${sheet.filename}`);
      const results = sheet.analysis_results;
      
      if (results) {
        const revenue = 
          parseFloat(results.total_revenue) || 
          parseFloat(results.revenue) || 
          parseFloat(results.income) || 
          0;

        const expenses = 
          parseFloat(results.total_expenses) || 
          parseFloat(results.expenses) || 
          parseFloat(results.costs) || 
          0;

        console.log(`Found revenue: ${revenue}, expenses: ${expenses} in ${sheet.filename}`);

        if (revenue > 0 || expenses > 0) {
          totalRevenue += revenue;
          totalExpenses += expenses;
          processedFiles++;
          
          insights.push(`${sheet.filename}:`);
          insights.push(`- Revenue: £${revenue.toFixed(2)}`);
          insights.push(`- Expenses: £${expenses.toFixed(2)}`);
          if (revenue > 0) {
            const fileMargin = ((revenue - expenses) / revenue) * 100;
            insights.push(`- Profit Margin: ${fileMargin.toFixed(2)}%`);
          }
        }
      }
    });

    console.log('Aggregated totals:', { totalRevenue, totalExpenses });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

    // Generate summary
    const summary = `Analysis of ${processedFiles} active financial documents completed. ` +
      `Total revenue: £${totalRevenue.toFixed(2)}. ` +
      `Total expenses: £${totalExpenses.toFixed(2)}. ` +
      `Overall profit margin: ${profitMargin.toFixed(2)}%. ` +
      `\n\nDetailed Breakdown:\n${insights.join('\n')}`;

    // Generate recommendations based on actual data
    const recommendations = [];
    
    if (profitMargin < 20) {
      recommendations.push({
        title: "Improve Profit Margins",
        description: `Current profit margin of ${profitMargin.toFixed(2)}% suggests room for improvement. Consider reviewing pricing strategy and cost structure.`,
        impact: "High",
        difficulty: "Medium"
      });
    }

    if (expenseRatio > 70) {
      recommendations.push({
        title: "Expense Optimization",
        description: `High expense ratio of ${expenseRatio.toFixed(2)}%. Review major expense categories for potential cost-saving opportunities.`,
        impact: "High",
        difficulty: "Medium"
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        title: "Financial Analysis Overview",
        description: `Analysis shows a healthy profit margin of ${profitMargin.toFixed(2)}%. Continue monitoring key metrics to maintain performance.`,
        impact: "Medium",
        difficulty: "Low"
      });
    }

    // Create new audit record
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
          audit_alerts: expenseRatio > 70 ? 1 : 0,
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
            value: `£${totalRevenue.toFixed(2)}`,
            trend: totalRevenue > 0 ? "increase" : "neutral"
          },
          {
            metric: "Total Expenses",
            value: `£${totalExpenses.toFixed(2)}`,
            trend: totalExpenses > 0 ? "increase" : "neutral"
          },
          {
            metric: "Profit Margin",
            value: `${profitMargin.toFixed(2)}%`,
            trend: profitMargin > 20 ? "positive" : "negative"
          },
          {
            metric: "Expense Ratio",
            value: `${expenseRatio.toFixed(2)}%`,
            trend: expenseRatio < 70 ? "positive" : "negative"
          }
        ],
        recommendations
      });

    if (auditError) {
      console.error('Error creating audit:', auditError);
      throw auditError;
    }

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
