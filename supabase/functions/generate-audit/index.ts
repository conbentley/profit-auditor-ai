
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id, website_data, spreadsheet_data, has_spreadsheets } = await req.json()

    if (!user_id) {
      throw new Error('User ID is required')
    }

    // Initialize analysis content
    let summary = ""
    let monthlyMetrics = {
      revenue: 0,
      profit_margin: 0,
      expense_ratio: 0,
      audit_alerts: 0,
      previous_month: {
        revenue: 0,
        profit_margin: 0,
        expense_ratio: 0,
        audit_alerts: 0
      }
    }
    
    let kpis = []
    let recommendations = []

    // Add website-based insights if available
    if (website_data) {
      const websiteInsights = JSON.parse(website_data.ai_analysis || '{}')
      const businessType = websiteInsights.businessType || website_data.website_type
      
      summary = `Based on website analysis, this appears to be a ${businessType} business. `
      summary += websiteInsights.targetAudience ? `The target audience is ${websiteInsights.targetAudience}. ` : ''
      
      // Add basic KPIs from website data
      kpis = [
        {
          metric: "Business Type",
          value: businessType
        },
        {
          metric: "Product/Service Offerings",
          value: `${websiteInsights.offerings?.length || 0} identified`
        }
      ]

      // Add website-based recommendations
      recommendations.push({
        title: "Website Opportunities",
        description: `Found ${websiteInsights.uniqueSellingPoints?.length || 0} unique selling points that could be leveraged for growth.`,
        impact: "Medium",
        difficulty: "Medium"
      })
    }

    // Add spreadsheet-based insights if available
    if (has_spreadsheets && spreadsheet_data?.length > 0) {
      // Process spreadsheet data for financial metrics
      const combinedAnalysis = spreadsheet_data.reduce((acc, sheet) => {
        const analysis = typeof sheet.analysis_results === 'string' 
          ? JSON.parse(sheet.analysis_results)
          : sheet.analysis_results

        if (analysis?.financial_metrics) {
          acc.revenue = (acc.revenue || 0) + (analysis.financial_metrics.total_revenue || 0)
          acc.expenses = (acc.expenses || 0) + (analysis.financial_metrics.total_cost || 0)
        }
        return acc
      }, {})

      // Calculate financial metrics
      if (combinedAnalysis.revenue > 0) {
        monthlyMetrics.revenue = combinedAnalysis.revenue
        monthlyMetrics.expense_ratio = combinedAnalysis.expenses / combinedAnalysis.revenue * 100
        monthlyMetrics.profit_margin = ((combinedAnalysis.revenue - combinedAnalysis.expenses) / combinedAnalysis.revenue) * 100
      }

      // Add financial KPIs
      kpis.push(
        {
          metric: "Monthly Revenue",
          value: `£${monthlyMetrics.revenue.toLocaleString()}`,
          trend: "+0%"
        },
        {
          metric: "Profit Margin",
          value: `${monthlyMetrics.profit_margin.toFixed(1)}%`,
          trend: "+0%"
        }
      )

      // Enhance summary with financial data
      summary += `Financial analysis shows a monthly revenue of £${monthlyMetrics.revenue.toLocaleString()} `
      summary += `with a profit margin of ${monthlyMetrics.profit_margin.toFixed(1)}%.`
    } else {
      // Add recommendation for uploading financial data
      recommendations.push({
        title: "Enhanced Analysis Opportunity",
        description: "Upload financial spreadsheets to unlock comprehensive business metrics and deeper insights.",
        impact: "High",
        difficulty: "Low"
      })
    }

    // Create the audit record
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const { error: insertError } = await supabaseClient
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary,
        monthly_metrics: monthlyMetrics,
        kpis,
        recommendations,
        analysis_metadata: {
          has_website_data: !!website_data,
          has_spreadsheet_data: has_spreadsheets
        }
      })

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating audit:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
