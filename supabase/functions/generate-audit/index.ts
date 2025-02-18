
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { user_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Generating audit for user:', user_id)

    // Get the latest processed spreadsheet data
    const { data: spreadsheetData, error: spreadsheetError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id)
      .eq('processed', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single()

    if (spreadsheetError) {
      console.error('Error fetching spreadsheet:', spreadsheetError)
    }

    const metrics = spreadsheetData?.analysis_results?.financial_metrics || {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin: 0,
      expense_ratio: 0
    }

    // Generate AI analysis using the metrics
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) throw new Error('OpenAI API key not configured')

    const analysisPrompt = `
      Analyze these financial metrics and provide a comprehensive business audit report:
      
      Financial Metrics:
      - Total Revenue: $${metrics.total_revenue.toFixed(2)}
      - Total Cost: $${metrics.total_cost.toFixed(2)}
      - Total Profit: $${metrics.total_profit.toFixed(2)}
      - Profit Margin: ${metrics.profit_margin.toFixed(2)}%
      - Expense Ratio: ${metrics.expense_ratio.toFixed(2)}%
      
      Generate a detailed audit report that includes:
      1. Executive Summary
      2. Key Performance Indicators
      3. Areas of Concern
      4. Specific, actionable recommendations
      5. Potential opportunities for growth
      
      Format the response in clear sections and be specific with numbers and percentages.
    `

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert financial analyst providing detailed business audits. Be thorough and professional.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) throw new Error('Failed to get AI analysis')

    const aiData = await aiResponse.json()
    const aiAnalysis = aiData.choices[0].message.content

    // Extract recommendations from the AI analysis
    const recommendationRegex = /(?:Recommendations?|Action Items?):([\s\S]*?)(?:\n\n|\n(?=[A-Z])|$)/i
    const recommendationsMatch = aiAnalysis.match(recommendationRegex)
    const recommendationsText = recommendationsMatch ? recommendationsMatch[1].trim() : ''

    // Convert recommendations text into structured format
    const recommendations = recommendationsText.split(/\d+\./).filter(Boolean).map(rec => ({
      title: rec.split('\n')[0].trim(),
      description: rec.split('\n').slice(1).join('\n').trim() || rec.trim(),
      impact: 'High',
      difficulty: 'Medium'
    }))

    // Generate KPIs
    const kpis = [
      {
        metric: 'Revenue',
        value: `$${metrics.total_revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
        trend: '+0%'
      },
      {
        metric: 'Profit Margin',
        value: `${metrics.profit_margin.toFixed(1)}%`,
        trend: '+0%'
      },
      {
        metric: 'Expense Ratio',
        value: `${metrics.expense_ratio.toFixed(1)}%`,
        trend: '+0%'
      }
    ]

    // Create the audit record
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary: aiAnalysis,
        monthly_metrics: {
          revenue: metrics.total_revenue,
          profit_margin: metrics.profit_margin,
          expense_ratio: metrics.expense_ratio,
          audit_alerts: recommendations.length,
          previous_month: {
            revenue: 0,
            profit_margin: 0,
            expense_ratio: 0,
            audit_alerts: 0
          }
        },
        kpis,
        recommendations
      })
      .select()
      .single()

    if (auditError) throw auditError

    return new Response(
      JSON.stringify({
        success: true,
        audit: auditData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating audit:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
