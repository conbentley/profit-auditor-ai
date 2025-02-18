import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function analyzeSpreadsheetData(supabase: any, userId: string) {
  const { data: uploads, error: uploadsError } = await supabase
    .from('spreadsheet_uploads')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', false);

  if (uploadsError) {
    console.error('Error fetching unprocessed uploads:', uploadsError);
    return null;
  }

  let spreadsheetInsights = [];

  for (const upload of uploads || []) {
    try {
      // Download the file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('spreadsheets')
        .download(upload.file_path);

      if (downloadError) {
        console.error('Error downloading file:', downloadError);
        continue;
      }

      // Read the spreadsheet
      const arrayBuffer = await fileData.arrayBuffer();
      const workbook = read(arrayBuffer);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = utils.sheet_to_json(firstSheet);

      // Analyze the data
      const numericColumns = new Set<string>();
      const columnTotals: Record<string, number> = {};
      
      // Identify numeric columns and calculate totals
      data.forEach((row: any) => {
        Object.entries(row).forEach(([key, value]) => {
          if (typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))) {
            numericColumns.add(key);
            columnTotals[key] = (columnTotals[key] || 0) + Number(value);
          }
        });
      });

      // Generate insights for financial columns
      numericColumns.forEach(column => {
        const columnLower = column.toLowerCase();
        if (columnLower.includes('amount') || 
            columnLower.includes('price') || 
            columnLower.includes('cost') || 
            columnLower.includes('revenue') || 
            columnLower.includes('profit')) {
          spreadsheetInsights.push({
            source: upload.filename,
            metric: column,
            total: columnTotals[column],
            rowCount: data.length
          });
        }
      });

      // Mark the upload as processed
      await supabase
        .from('spreadsheet_uploads')
        .update({ 
          processed: true,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', upload.id);

    } catch (error) {
      console.error(`Error processing spreadsheet ${upload.filename}:`, error);
      await supabase
        .from('spreadsheet_uploads')
        .update({ 
          processing_error: error.message,
          processed: true
        })
        .eq('id', upload.id);
    }
  }

  return spreadsheetInsights;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, month, year } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Analyze spreadsheet data first
    const spreadsheetInsights = await analyzeSpreadsheetData(supabase, user_id);
    
    // Fetch data from all integration types
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // 1. Financial transactions and metrics
    const { data: transactions } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('user_id', user_id)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());

    // 2. E-commerce data
    const { data: ecommerceMetrics } = await supabase
      .from('ecommerce_metrics')
      .select('*')
      .eq('user_id', user_id)
      .gte('metric_date', startDate.toISOString())
      .lte('metric_date', endDate.toISOString());

    const { data: ecommerceSales } = await supabase
      .from('ecommerce_sales')
      .select('*')
      .eq('user_id', user_id)
      .gte('sale_date', startDate.toISOString())
      .lte('sale_date', endDate.toISOString());

    // 3. Payment processing data
    const { data: paymentIntegrations } = await supabase
      .from('payment_integrations')
      .select('*')
      .eq('user_id', user_id);

    // 4. Marketing performance data
    const { data: marketingData } = await supabase
      .from('marketing_performance')
      .select('*')
      .eq('user_id', user_id)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    // 5. CRM data
    const { data: crmIntegrations } = await supabase
      .from('crm_integrations')
      .select('*')
      .eq('user_id', user_id);

    // Calculate comprehensive metrics
    const revenue = transactions
      ?.filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const expenses = transactions
      ?.filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0;

    const profit_margin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

    // Calculate e-commerce specific metrics
    const ecommerce_revenue = ecommerceSales?.reduce((sum, sale) => sum + Number(sale.total_price), 0) ?? 0;
    const average_order_value = ecommerceSales && ecommerceSales.length > 0
      ? ecommerce_revenue / ecommerceSales.length
      : 0;

    // Calculate marketing ROI
    const marketing_spend = marketingData?.reduce((sum, data) => sum + Number(data.spend), 0) ?? 0;
    const marketing_revenue = marketingData?.reduce((sum, data) => sum + (Number(data.revenue) || 0), 0) ?? 0;
    const marketing_roi = marketing_spend > 0 ? ((marketing_revenue - marketing_spend) / marketing_spend) * 100 : 0;

    // Prepare the comprehensive business data for AI analysis
    const businessData = {
      financial: {
        revenue,
        expenses,
        profit_margin,
        transactions: transactions || [],
        cost_breakdown: transactions
          ?.filter(t => t.type === 'expense')
          .reduce((acc, t) => {
            const category = t.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + Number(t.amount);
            return acc;
          }, {} as Record<string, number>)
      },
      ecommerce: {
        revenue: ecommerce_revenue,
        average_order_value,
        total_orders: ecommerceSales?.length ?? 0,
        metrics: ecommerceMetrics || [],
        sales: ecommerceSales || []
      },
      marketing: {
        spend: marketing_spend,
        revenue: marketing_revenue,
        roi: marketing_roi,
        performance: marketingData || []
      },
      integrations: {
        payment: paymentIntegrations || [],
        crm: crmIntegrations || [],
        active_platforms: {
          payment: paymentIntegrations?.filter(i => i.is_active).map(i => i.provider) || [],
          ecommerce: ecommerceMetrics?.map(m => m.integration_id) || [],
          crm: crmIntegrations?.filter(i => i.is_active).map(i => i.platform) || []
        }
      }
    };

    // Generate AI analysis with enhanced integration data
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an advanced financial and business analyst AI specializing in holistic business optimization.
            Analyze data across multiple integration points:
            1. Financial Health:
               - Revenue streams and expense patterns
               - Profit margins and cash flow
               - Cost optimization opportunities
            2. E-commerce Performance:
               - Sales trends and order values
               - Platform-specific performance
               - Inventory and pricing optimization
            3. Payment Processing:
               - Transaction costs and efficiency
               - Payment method distribution
               - Provider-specific insights
            4. Marketing ROI:
               - Channel effectiveness
               - Customer acquisition costs
               - Cross-platform opportunities
            5. CRM Performance:
               - Customer engagement metrics
               - Sales pipeline health
               - Lead conversion rates
            6. Integration Optimization:
               - Platform utilization
               - Cross-integration opportunities
               - Technical efficiency recommendations
            7. Risk Analysis:
               - Platform dependencies
               - Revenue concentration
               - Market exposure
            8. Strategic Recommendations:
               - Growth opportunities
               - Cost optimization
               - Platform consolidation
               - Market expansion
               - Customer retention strategies
            
            Return ONLY a JSON object with this exact structure:
            {
              "summary": "Executive summary of comprehensive analysis",
              "kpis": [
                {"metric": "string", "value": "string", "trend": "string", "category": "financial|ecommerce|marketing|crm|integration"}
              ],
              "recommendations": [
                {
                  "title": "string",
                  "description": "string",
                  "impact": "High/Medium/Low",
                  "difficulty": "Easy/Medium/Hard",
                  "category": "financial|ecommerce|marketing|crm|integration|strategic",
                  "priority": 1-5
                }
              ],
              "alerts": [
                {
                  "type": "risk|opportunity|action",
                  "severity": "High/Medium/Low",
                  "message": "string",
                  "category": "financial|ecommerce|marketing|crm|integration"
                }
              ]
            }`
          },
          {
            role: 'user',
            content: `Analyze this comprehensive business data and provide specific recommendations: ${JSON.stringify(businessData)}`
          }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Include spreadsheet insights in the audit summary and recommendations
    let additionalSummary = '';
    let additionalRecommendations = [];

    if (spreadsheetInsights && spreadsheetInsights.length > 0) {
      additionalSummary = "\n\nSpreadsheet Analysis:\n";
      spreadsheetInsights.forEach(insight => {
        additionalSummary += `Found ${insight.metric} data in ${insight.source} with a total of ${insight.total} across ${insight.rowCount} rows.\n`;
        
        if (insight.metric.toLowerCase().includes('revenue')) {
          additionalRecommendations.push({
            title: `Revenue Data from ${insight.source}`,
            description: `Additional revenue data found in uploaded spreadsheet showing a total of ${insight.total}. Consider integrating this data with your primary financial tracking.`,
            impact: 'medium',
            difficulty: 'medium',
            estimated_savings: 0
          });
        }
        
        if (insight.metric.toLowerCase().includes('cost')) {
          additionalRecommendations.push({
            title: `Cost Analysis from ${insight.source}`,
            description: `Cost data identified in spreadsheet showing total expenses of ${insight.total}. Review these costs for potential optimization opportunities.`,
            impact: 'high',
            difficulty: 'medium',
            estimated_savings: insight.total * 0.1 // Estimate 10% potential savings
          });
        }
      });
    }

    // Create the audit report with combined insights
    const { data: existingAudit, error: existingAuditError } = await supabase
      .from('financial_audits')
      .select('summary, recommendations')
      .eq('user_id', user_id)
      .eq('audit_date', `${year}-${month.toString().padStart(2, '0')}-01`)
      .maybeSingle();

    const summary = (existingAudit?.summary || '') + additionalSummary;
    const recommendations = [
      ...(existingAudit?.recommendations || []),
      ...additionalRecommendations
    ];

    // Store audit results with enhanced metrics
    const { data: audit, error: insertError } = await supabase
      .from('financial_audits')
      .insert({
        user_id,
        audit_date: new Date(year, month - 1).toISOString(),
        summary: analysis.summary,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations,
        monthly_metrics: {
          revenue,
          profit_margin,
          expense_ratio: expenses > 0 ? (expenses / revenue) * 100 : 0,
          marketing_roi,
          ecommerce_metrics: {
            revenue: ecommerce_revenue,
            average_order_value,
            total_orders: ecommerceSales?.length ?? 0
          },
          audit_alerts: analysis.alerts?.length ?? 0,
          previous_month: {
            revenue: 0,
            profit_margin: 0,
            expense_ratio: 0,
            marketing_roi: 0,
            audit_alerts: 0
          }
        },
        analysis_metadata: {
          data_sources: [
            'financial_transactions',
            'ecommerce_metrics',
            'ecommerce_sales',
            'payment_integrations',
            'marketing_performance',
            'crm_integrations'
          ],
          ai_model: 'gpt-4o-mini',
          timestamp: new Date().toISOString(),
          integration_coverage: {
            payment: paymentIntegrations?.length ?? 0,
            ecommerce: ecommerceMetrics?.length ?? 0,
            marketing: marketingData?.length ?? 0,
            crm: crmIntegrations?.length ?? 0
          }
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, audit }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating audit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
