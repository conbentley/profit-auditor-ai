
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
    const { uploadId } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch upload details
    const { data: upload, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) throw new Error('Upload not found');

    // Download file content
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError) throw downloadError;

    // Parse CSV content
    const text = await fileData.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];
    const dataRows = rows.slice(1).filter(row => row.length === headers.length);

    // Basic analysis
    const numericColumns = headers.map((_, colIndex) => {
      return dataRows.every(row => !isNaN(Number(row[colIndex])));
    });

    let totalRevenue = 0;
    let totalExpenses = 0;

    // Process data rows
    const transactions = dataRows.map(row => {
      const transaction: any = {};
      headers.forEach((header, index) => {
        const value = row[index].trim();
        if (numericColumns[index]) {
          transaction[header] = Number(value);
          if (header.toLowerCase().includes('revenue') || header.toLowerCase().includes('income')) {
            totalRevenue += Number(value);
          } else if (header.toLowerCase().includes('expense') || header.toLowerCase().includes('cost')) {
            totalExpenses += Number(value);
          }
        } else {
          transaction[header] = value;
        }
      });
      return transaction;
    });

    // Calculate metrics
    const analysis = {
      total_rows: dataRows.length,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      profit_margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0,
      headers: headers,
      insights: []
    };

    // Generate insights
    if (totalRevenue > 0) {
      analysis.insights.push(`Total revenue: ${totalRevenue.toFixed(2)}`);
    }
    if (totalExpenses > 0) {
      analysis.insights.push(`Total expenses: ${totalExpenses.toFixed(2)}`);
    }
    if (analysis.profit_margin !== 0) {
      analysis.insights.push(`Profit margin: ${analysis.profit_margin.toFixed(2)}%`);
    }

    // Update the upload record
    const { error: updateError } = await supabase
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysis,
        analyzed_at: new Date().toISOString()
      })
      .eq('id', uploadId);

    if (updateError) throw updateError;

    // Generate financial audit
    await supabase
      .from('financial_audits')
      .insert({
        user_id: upload.user_id,
        audit_date: new Date().toISOString(),
        summary: `Analysis of ${upload.filename} completed successfully.`,
        monthly_metrics: {
          revenue: totalRevenue,
          expense_ratio: totalExpenses > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
          profit_margin: analysis.profit_margin,
          audit_alerts: 0
        },
        kpis: [
          {
            metric: "Total Revenue",
            value: totalRevenue.toFixed(2),
          },
          {
            metric: "Total Expenses",
            value: totalExpenses.toFixed(2),
          },
          {
            metric: "Profit Margin",
            value: `${analysis.profit_margin.toFixed(2)}%`,
          }
        ],
        recommendations: [
          {
            title: "Initial Data Analysis",
            description: "Your financial data has been processed. Check the Analytics dashboard for detailed insights.",
            impact: "High",
            difficulty: "Low"
          }
        ]
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
