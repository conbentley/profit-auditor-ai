
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Generating audit for user:', user_id);

    // Get the latest processed spreadsheet data
    const { data: spreadsheetData, error: spreadsheetError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', user_id)
      .eq('processed', true)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .single();

    if (spreadsheetError) {
      console.error('Error fetching spreadsheet:', spreadsheetError);
    }

    const metrics = spreadsheetData?.analysis_results?.financial_metrics || {
      total_revenue: 0,
      total_cost: 0,
      total_profit: 0,
      profit_margin: 0,
      expense_ratio: 0
    };

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) throw new Error('OpenAI API key not configured');

    const analysisPrompt = `
      You are a professional financial analyst. Create a detailed business audit report based on these metrics:
      
      Financial Metrics:
      - Total Revenue: $${metrics.total_revenue.toFixed(2)}
      - Total Cost: $${metrics.total_cost.toFixed(2)}
      - Total Profit: $${metrics.total_profit.toFixed(2)}
      - Profit Margin: ${metrics.profit_margin.toFixed(2)}%
      - Expense Ratio: ${metrics.expense_ratio.toFixed(2)}%
      
      Generate a comprehensive audit report with ONLY these exact sections in this order:
      1. Executive Summary (brief overview of financial health, max 2 paragraphs)
      2. Key Performance Indicators (list the metrics with their values)
      3. KPI Analysis (detailed analysis of each metric)
      4. Areas of Concern (identify potential issues)

      After the main report, generate recommendations in this exact format, but keep them separate from the main report:
      
      5. Recommendations (DO NOT include this in the main report text)
      For each recommendation, provide:
      - Title: Clear action item
      - Description: Detailed explanation
      - Impact: High/Medium/Low
      - Difficulty: Easy/Medium/Hard

      Use clear, professional language and be specific with numbers.
      Don't use markdown symbols like # or **.
      Keep sections clearly numbered and formatted.
      Do not mention recommendations anywhere in sections 1-4.
    `;

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
    });

    if (!aiResponse.ok) throw new Error('Failed to get AI analysis');

    const aiData = await aiResponse.json();
    const aiAnalysis = aiData.choices[0].message.content;

    // Extract recommendations section
    const recommendationsSection = aiAnalysis.match(/5\.\s*Recommendations([\s\S]*?)(?=6\.|$)/i)?.[1] || '';
    
    // Remove recommendations section from main analysis
    const mainAnalysis = aiAnalysis.replace(/5\.\s*Recommendations[\s\S]*?(?=6\.|$)/i, '');
    
    // Parse recommendations into structured format
    const recommendations = recommendationsSection
      .split(/(?=Title:)/)
      .filter(rec => rec.trim())
      .map(rec => {
        const title = rec.match(/Title:\s*([^\n]+)/)?.[1] || '';
        const description = rec.match(/Description:\s*([^\n]+)/)?.[1] || '';
        const impact = rec.match(/Impact:\s*([^\n]+)/)?.[1] || 'Medium';
        const difficulty = rec.match(/Difficulty:\s*([^\n]+)/)?.[1] || 'Medium';
        
        return {
          title,
          description,
          impact,
          difficulty
        };
      });

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
    ];

    // Create the audit record
    const { data: auditData, error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date().toISOString(),
        summary: mainAnalysis,
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
      .single();

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({
        success: true,
        audit: auditData
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
