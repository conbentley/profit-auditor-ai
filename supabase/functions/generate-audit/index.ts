
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function calculateImpactScore(opportunity: any): string {
  const impact = parseFloat(opportunity.impact.replace('%', '')) || 0;
  if (impact > 25) return "High";
  if (impact > 10) return "Medium";
  return "Low";
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, website_data, spreadsheet_data, has_spreadsheets } = await req.json();

    if (!user_id) {
      throw new Error('User ID is required');
    }

    let summary = "";
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
    };
    
    let kpis = [];
    let recommendations = [];
    let auditAlerts = 0;

    if (website_data) {
      const websiteInsights = JSON.parse(website_data.ai_analysis || '{}');
      const rawScanData = website_data.raw_scan_data || {};
      const businessType = websiteInsights.businessType;
      const offerings = websiteInsights.offerings || [];
      const pricingStrategy = websiteInsights.pricingStrategy;
      const competitiveAdvantages = websiteInsights.competitiveAdvantages || [];
      const growthOpportunities = websiteInsights.growthOpportunities || [];
      const revenuePotential = websiteInsights.revenuePotential || [];
      const brandAnalysis = websiteInsights.brandAnalysis || {};
      const customerPainPoints = websiteInsights.customerPainPoints || [];

      // Comprehensive summary
      summary = `Your ${businessType} has ${offerings.length} products/services identified. `;
      summary += `Market positioning: ${websiteInsights.marketPositioning}. `;
      
      if (pricingStrategy) {
        summary += `Current pricing strategy: ${pricingStrategy}. `;
      }

      // Market Position KPIs
      kpis.push({
        metric: "Market Position Strength",
        value: `${competitiveAdvantages.length} unique advantages`,
        trend: competitiveAdvantages.length > 3 ? "Strong" : "Needs improvement"
      });

      // Product Portfolio KPIs
      kpis.push({
        metric: "Product Catalog",
        value: `${offerings.length} offerings`,
        trend: offerings.length > 20 ? "Diverse" : "Limited"
      });

      // Growth Opportunities with Revenue Impact
      if (growthOpportunities.length > 0) {
        let totalRevenuePotential = 0;
        growthOpportunities.forEach((opportunity: any, index: number) => {
          const impact = parseFloat(opportunity.impact.replace('%', '')) || 0;
          totalRevenuePotential += impact;
          
          recommendations.push({
            title: `Revenue Growth Opportunity ${index + 1}`,
            description: `${opportunity.opportunity}\n\nImplementation Steps:\n${opportunity.implementation}\nTimeframe: ${opportunity.timeframe}\nRequired Resources: ${opportunity.resources}`,
            impact: calculateImpactScore(opportunity),
            difficulty: opportunity.timeframe.includes("month") ? "Medium" : "High",
            estimated_profit_increase: `${impact}%`
          });
        });

        recommendations.push({
          title: "Total Growth Potential",
          description: `Combined implementation of all identified opportunities could result in ${totalRevenuePotential}% revenue growth.`,
          impact: "High",
          difficulty: "High",
          estimated_profit_increase: `${totalRevenuePotential}%`
        });
      }

      // Revenue Stream Analysis
      if (revenuePotential.length > 0) {
        revenuePotential.forEach((stream: any) => {
          recommendations.push({
            title: `New Revenue Stream: ${stream.stream}`,
            description: `Potential: ${stream.potential}\nRequirements: ${stream.requirements}`,
            impact: "High",
            difficulty: "Medium",
            estimated_profit_increase: stream.potential
          });
        });
      }

      // Brand and Market Position Recommendations
      if (brandAnalysis.improvement_areas?.length > 0) {
        brandAnalysis.improvement_areas.forEach((area: string) => {
          recommendations.push({
            title: "Brand Enhancement Opportunity",
            description: `Area for improvement: ${area}`,
            impact: "Medium",
            difficulty: "Medium",
            estimated_profit_increase: "5-10%"
          });
          auditAlerts++;
        });
      }

      // Customer Pain Points Analysis
      if (customerPainPoints.length > 0) {
        const painPointsRecommendation = {
          title: "Customer Experience Optimization",
          description: `Identified ${customerPainPoints.length} customer pain points:\n` +
            customerPainPoints.map((point: string) => `• ${point}`).join('\n') +
            '\nAddressing these issues could significantly improve customer satisfaction and retention.',
          impact: "High",
          difficulty: "Medium",
          estimated_profit_increase: "15-20%"
        };
        recommendations.push(painPointsRecommendation);
        auditAlerts += customerPainPoints.length;
      }
    }

    // Financial Analysis
    if (has_spreadsheets && spreadsheet_data?.length > 0) {
      const combinedAnalysis = spreadsheet_data.reduce((acc: any, sheet: any) => {
        const analysis = typeof sheet.analysis_results === 'string' 
          ? JSON.parse(sheet.analysis_results)
          : sheet.analysis_results;

        if (analysis?.financial_metrics) {
          acc.revenue = (acc.revenue || 0) + (analysis.financial_metrics.total_revenue || 0);
          acc.expenses = (acc.expenses || 0) + (analysis.financial_metrics.total_cost || 0);
        }
        return acc;
      }, {});

      if (combinedAnalysis.revenue > 0) {
        monthlyMetrics.revenue = combinedAnalysis.revenue;
        monthlyMetrics.expense_ratio = (combinedAnalysis.expenses / combinedAnalysis.revenue) * 100;
        monthlyMetrics.profit_margin = ((combinedAnalysis.revenue - combinedAnalysis.expenses) / combinedAnalysis.revenue) * 100;

        kpis.push(
          {
            metric: "Monthly Revenue",
            value: formatCurrency(monthlyMetrics.revenue),
            trend: monthlyMetrics.revenue > 10000 ? "Strong" : "Growing"
          },
          {
            metric: "Profit Margin",
            value: `${monthlyMetrics.profit_margin.toFixed(1)}%`,
            trend: monthlyMetrics.profit_margin > 20 ? "Healthy" : "Needs attention"
          }
        );

        summary += `Financial analysis reveals ${formatCurrency(monthlyMetrics.revenue)} monthly revenue with ${monthlyMetrics.profit_margin.toFixed(1)}% profit margin. `;
        
        if (monthlyMetrics.expense_ratio > 70) {
          recommendations.push({
            title: "Critical Cost Structure Review",
            description: `Your expense ratio of ${monthlyMetrics.expense_ratio.toFixed(1)}% is significantly high. Specific areas to review:\n` +
                        "• Supplier agreements and bulk purchasing opportunities\n" +
                        "• Operational efficiency improvements\n" +
                        "• Resource allocation optimization\n" +
                        "• Process automation opportunities",
            impact: "High",
            difficulty: "Medium",
            estimated_profit_increase: "12-15%"
          });
          auditAlerts++;
        }
      }
    }

    monthlyMetrics.audit_alerts = auditAlerts;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

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
          alerts_generated: auditAlerts,
          opportunities_identified: recommendations.length
        }
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ message: 'Audit generated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating audit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
