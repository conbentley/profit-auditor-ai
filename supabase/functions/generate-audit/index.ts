
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function estimateProfitIncrease(sellingPoint: string): number {
  // Conservative profit increase estimates based on selling point type
  if (sellingPoint.toLowerCase().includes('quality') || 
      sellingPoint.toLowerCase().includes('premium')) {
    return 15; // Premium positioning typically allows for higher margins
  }
  if (sellingPoint.toLowerCase().includes('service') || 
      sellingPoint.toLowerCase().includes('support')) {
    return 10; // Better service can increase customer retention
  }
  if (sellingPoint.toLowerCase().includes('price') || 
      sellingPoint.toLowerCase().includes('affordable')) {
    return 5; // Volume-based strategy
  }
  return 8; // Default conservative estimate
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

    // Process website data
    if (website_data) {
      const websiteInsights = JSON.parse(website_data.ai_analysis || '{}')
      const businessType = websiteInsights.businessType || website_data.website_type
      const offerings = websiteInsights.offerings || []
      const uniqueSellingPoints = websiteInsights.uniqueSellingPoints || []
      
      // Enhanced summary with more details
      summary = `Analysis of your ${businessType} business website has identified ${offerings.length} distinct products/services. `
      if (websiteInsights.targetAudience) {
        summary += `Your target audience is identified as ${websiteInsights.targetAudience}. `
      }
      
      // Add detailed KPIs from website data
      kpis = [
        {
          metric: "Business Type",
          value: businessType
        },
        {
          metric: "Product/Service Offerings",
          value: `${offerings.length} products/services`,
          trend: offerings.length > 10 ? "Strong catalog" : "Room for expansion"
        }
      ]

      // If we have unique selling points, create detailed recommendations
      if (uniqueSellingPoints.length > 0) {
        const totalProfitIncrease = uniqueSellingPoints.reduce((acc, point) => 
          acc + estimateProfitIncrease(point), 0);
        
        // Create a detailed recommendation for each selling point
        uniqueSellingPoints.forEach((point, index) => {
          const estimatedIncrease = estimateProfitIncrease(point);
          recommendations.push({
            title: `Growth Opportunity ${index + 1}: ${point}`,
            description: `Leverage this unique selling point: ${point}. Based on market analysis, effectively promoting this aspect could increase profit margins.`,
            impact: estimatedIncrease > 10 ? "High" : "Medium",
            difficulty: "Medium",
            estimated_profit_increase: `${estimatedIncrease}%`
          });
        });

        // Add summary recommendation
        recommendations.push({
          title: "Combined Growth Potential",
          description: `By leveraging all ${uniqueSellingPoints.length} unique selling points identified, you could potentially increase overall profitability. Focus on implementing these changes systematically.`,
          impact: "High",
          difficulty: "Medium",
          estimated_profit_increase: `${totalProfitIncrease}%`
        });
      }

      // Add product catalog recommendations if relevant
      if (offerings.length > 0) {
        kpis.push({
          metric: "Product Diversity",
          value: `${offerings.length} offerings analyzed`,
          trend: "→"
        });

        // Group offerings by category if possible
        const categories = new Set(offerings.map(o => o.split(' ')[0]));
        if (categories.size > 1) {
          kpis.push({
            metric: "Product Categories",
            value: `${categories.size} distinct categories`,
            trend: "↗"
          });
        }
      }
    }

    // Process financial data if available
    if (has_spreadsheets && spreadsheet_data?.length > 0) {
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

      if (combinedAnalysis.revenue > 0) {
        monthlyMetrics.revenue = combinedAnalysis.revenue
        monthlyMetrics.expense_ratio = combinedAnalysis.expenses / combinedAnalysis.revenue * 100
        monthlyMetrics.profit_margin = ((combinedAnalysis.revenue - combinedAnalysis.expenses) / combinedAnalysis.revenue) * 100

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

        summary += `Financial analysis shows monthly revenue of £${monthlyMetrics.revenue.toLocaleString()} `
        summary += `with a current profit margin of ${monthlyMetrics.profit_margin.toFixed(1)}%. `
        
        // Add specific financial recommendations
        if (monthlyMetrics.expense_ratio > 70) {
          recommendations.push({
            title: "Cost Optimization Required",
            description: "Your expense ratio is high at " + monthlyMetrics.expense_ratio.toFixed(1) + "%. Consider reviewing operational costs and supplier agreements.",
            impact: "High",
            difficulty: "Medium",
            estimated_profit_increase: "8-12%"
          })
        }
      }
    } else {
      recommendations.push({
        title: "Enhanced Analysis Opportunity",
        description: "Upload financial spreadsheets to unlock comprehensive business metrics and receive detailed profit optimization strategies.",
        impact: "High",
        difficulty: "Low",
        estimated_profit_increase: "Requires financial data"
      })
    }

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
          has_spreadsheet_data: has_spreadsheets,
          total_offerings_analyzed: website_data ? JSON.parse(website_data.ai_analysis || '{}').offerings?.length || 0 : 0
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
