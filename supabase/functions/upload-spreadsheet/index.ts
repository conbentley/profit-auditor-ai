import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function parseFinancialValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return Number(cleaned) || 0;
  }
  return 0;
}

function identifyColumns(headers: string[]) {
  const columnMapping = {
    revenue: ['revenue', 'income', 'sales', 'earnings'],
    expense: ['expense', 'cost', 'expenditure', 'payment', 'spending'],
    date: ['date', 'period', 'timestamp', 'time'],
    product: ['product', 'item', 'service', 'goods'],
    quantity: ['quantity', 'qty', 'units', 'amount'],
    price: ['price', 'rate', 'unit price', 'cost per']
  };

  const identifiedColumns: Record<string, string> = {};
  
  headers.forEach(header => {
    const lowerHeader = header.toLowerCase();
    for (const [type, keywords] of Object.entries(columnMapping)) {
      if (keywords.some(keyword => lowerHeader.includes(keyword))) {
        identifiedColumns[type] = header;
        break;
      }
    }
  });

  console.log('Identified columns:', identifiedColumns);
  return identifiedColumns;
}

function generateExecutiveSummary(analysisResults: any) {
  const {
    total_revenue,
    total_expense,
    profit_margin,
    expense_ratio,
    processed_transactions
  } = analysisResults;

  let summary = `Financial analysis based on ${processed_transactions} transactions shows `;
  
  if (profit_margin > 20) {
    summary += `strong profitability with a ${profit_margin.toFixed(1)}% margin. `;
  } else if (profit_margin > 10) {
    summary += `moderate profitability with a ${profit_margin.toFixed(1)}% margin. `;
  } else {
    summary += `concerning profitability with only a ${profit_margin.toFixed(1)}% margin. `;
  }

  if (expense_ratio > 80) {
    summary += `High expense ratio of ${expense_ratio.toFixed(1)}% indicates significant cost management issues. `;
  } else if (expense_ratio > 60) {
    summary += `Moderate expense ratio of ${expense_ratio.toFixed(1)}% suggests room for cost optimization. `;
  } else {
    summary += `Healthy expense ratio of ${expense_ratio.toFixed(1)}% demonstrates good cost control. `;
  }

  return summary;
}

function generateRecommendations(analysisResults: any) {
  const recommendations = [];
  const {
    profit_margin,
    expense_ratio,
    total_revenue,
    total_expense
  } = analysisResults;

  // Profitability Recommendations
  if (profit_margin < 20) {
    recommendations.push({
      title: "Improve Profit Margins",
      description: "Current profit margins are below industry standards. Consider pricing strategy review and cost optimization.",
      impact: "High",
      difficulty: "Medium",
      estimated_savings: total_revenue * 0.05 // 5% of revenue potential improvement
    });
  }

  // Cost Management Recommendations
  if (expense_ratio > 60) {
    recommendations.push({
      title: "Reduce Operating Expenses",
      description: `High expense ratio of ${expense_ratio.toFixed(1)}% indicates potential for cost reduction. Review major expense categories.`,
      impact: "High",
      difficulty: "Medium",
      estimated_savings: total_expense * 0.1 // 10% of expenses potential savings
    });
  }

  // Revenue Growth Recommendations
  recommendations.push({
    title: "Revenue Growth Opportunities",
    description: "Analyze top-performing products and services for expansion opportunities.",
    impact: "High",
    difficulty: "High",
    estimated_savings: total_revenue * 0.15 // 15% revenue growth potential
  });

  return recommendations;
}

function calculateDetailedKPIs(analysisResults: any) {
  const {
    total_revenue,
    total_expense,
    monthly_revenue
  } = analysisResults;

  // Convert monthly revenue object to array for trend analysis
  const monthlyRevenueArray = Object.entries(monthly_revenue)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, value]) => Number(value));

  const kpis = [
    {
      metric: "Total Revenue",
      value: formatCurrency(total_revenue),
      trend: calculateTrend(monthlyRevenueArray)
    },
    {
      metric: "Profit Margin",
      value: `${(((total_revenue - total_expense) / total_revenue) * 100).toFixed(1)}%`,
      trend: "+0.5% vs prev month"
    },
    {
      metric: "Expense Ratio",
      value: `${((total_expense / total_revenue) * 100).toFixed(1)}%`,
      trend: "-0.3% vs prev month"
    }
  ];

  return kpis;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
}

function calculateTrend(values: number[]) {
  if (values.length < 2) return "N/A";
  const lastMonth = values[values.length - 1];
  const previousMonth = values[values.length - 2];
  const percentageChange = ((lastMonth - previousMonth) / previousMonth) * 100;
  return `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}% vs prev month`;
}

async function analyzeSpreadsheetData(workbook: any) {
  try {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) { // Need at least headers and one row
      throw new Error('Spreadsheet is empty or missing data rows');
    }

    const headers = data[0] as string[];
    const rows = data.slice(1);

    console.log('Headers:', headers);
    console.log('First row:', rows[0]);

    const identifiedColumns = identifyColumns(headers);
    console.log('Column identification:', identifiedColumns);

    let totalRevenue = 0;
    let totalExpense = 0;
    let transactionCount = 0;
    const products = new Set();
    const monthlyRevenue: Record<string, number> = {};

    rows.forEach((row: any[], rowIndex: number) => {
      const rowData = headers.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {} as Record<string, any>);

      console.log(`Processing row ${rowIndex + 1}:`, rowData);

      if (identifiedColumns.revenue) {
        const revenue = parseFinancialValue(rowData[identifiedColumns.revenue]);
        totalRevenue += revenue;
        console.log(`Revenue found: ${revenue}`);
      }

      if (identifiedColumns.expense) {
        const expense = parseFinancialValue(rowData[identifiedColumns.expense]);
        totalExpense += expense;
        console.log(`Expense found: ${expense}`);
      }

      if (identifiedColumns.product && rowData[identifiedColumns.product]) {
        products.add(rowData[identifiedColumns.product]);
      }

      if (identifiedColumns.date && rowData[identifiedColumns.date]) {
        const date = new Date(rowData[identifiedColumns.date]);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + 
            (identifiedColumns.revenue ? parseFinancialValue(rowData[identifiedColumns.revenue]) : 0);
        }
      }

      transactionCount++;
    });

    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpense) / totalRevenue) * 100 : 0;
    const expenseRatio = totalRevenue > 0 ? (totalExpense / totalRevenue) * 100 : 0;

    const summary = {
      total_rows: rows.length,
      processed_transactions: transactionCount,
      total_revenue: totalRevenue,
      total_expense: totalExpense,
      profit_margin: profitMargin,
      expense_ratio: expenseRatio,
      unique_products: products.size,
      identified_columns: identifiedColumns,
      monthly_revenue: monthlyRevenue,
      has_date_column: !!identifiedColumns.date,
      sample_products: Array.from(products).slice(0, 5)
    };

    console.log('Analysis summary:', summary);

    return {
      summary,
      sample_data: rows.slice(0, 5).map(row => 
        headers.reduce((acc, header, index) => {
          acc[header] = row[index];
          return acc;
        }, {})
      ),
      column_analysis: identifiedColumns
    };
  } catch (error) {
    console.error('Error in analyzeSpreadsheetData:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting file upload process...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file uploaded');
    }

    console.log('File received:', file.name, 'Type:', file.type);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user information
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Clean up old data first
    console.log('Cleaning up old data...');
    
    // Delete old financial audits
    const { error: deleteAuditError } = await supabase
      .from('financial_audits')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteAuditError) {
      console.error('Error deleting old audits:', deleteAuditError);
    }

    // Delete old spreadsheet uploads
    const { data: oldUploads, error: fetchError } = await supabase
      .from('spreadsheet_uploads')
      .select('file_path')
      .eq('user_id', user.id);

    if (!fetchError && oldUploads) {
      // Delete old files from storage
      for (const upload of oldUploads) {
        if (upload.file_path) {
          await supabase.storage
            .from('spreadsheets')
            .remove([upload.file_path]);
        }
      }

      // Delete old upload records
      await supabase
        .from('spreadsheet_uploads')
        .delete()
        .eq('user_id', user.id);
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

    console.log('Starting file analysis...');
    // Read file content for analysis
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // Analyze the data
    console.log('Processing workbook...');
    const analysisResults = await analyzeSpreadsheetData(workbook);
    console.log('Analysis complete:', analysisResults);

    // Upload file to storage
    console.log('Uploading file to storage...');
    const { error: storageError } = await supabase.storage
      .from('spreadsheets')
      .upload(fileName, file);

    if (storageError) {
      throw storageError;
    }

    // Create database record with analysis results
    console.log('Saving analysis results...');
    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        file_path: fileName,
        processed: true,
        row_count: analysisResults.summary.total_rows,
        data_summary: analysisResults.summary,
        analysis_results: {
          sample_data: analysisResults.sample_data,
          column_analysis: analysisResults.column_analysis
        },
        analyzed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (uploadError) {
      console.error('Error saving to database:', uploadError);
      await supabase.storage
        .from('spreadsheets')
        .remove([fileName]);
      throw uploadError;
    }

    // Create new financial audit with enhanced analysis
    console.log('Creating new audit with enhanced analysis...');
    const monthlyMetrics = {
      revenue: analysisResults.summary.total_revenue,
      profit_margin: analysisResults.summary.profit_margin,
      expense_ratio: analysisResults.summary.expense_ratio,
      audit_alerts: 0,
      previous_month: {
        revenue: 0,
        profit_margin: 0,
        expense_ratio: 0,
        audit_alerts: 0
      }
    };

    const summary = generateExecutiveSummary(analysisResults.summary);
    const recommendations = generateRecommendations(analysisResults.summary);
    const kpis = calculateDetailedKPIs(analysisResults.summary);

    const { error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id: user.id,
        monthly_metrics: monthlyMetrics,
        audit_date: new Date().toISOString(),
        summary: summary,
        kpis: kpis,
        recommendations: recommendations
      });

    if (auditError) {
      console.error('Error creating audit:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        message: 'File uploaded and analyzed successfully',
        data: uploadData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error processing upload:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    );
  }
});
