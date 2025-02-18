
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
    // Remove currency symbols, commas, and other non-numeric characters except decimal points and minus signs
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
      // Create an object mapping headers to values for easier access
      const rowData = headers.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {} as Record<string, any>);

      console.log(`Processing row ${rowIndex + 1}:`, rowData);

      // Process revenue
      if (identifiedColumns.revenue) {
        const revenue = parseFinancialValue(rowData[identifiedColumns.revenue]);
        totalRevenue += revenue;
        console.log(`Revenue found: ${revenue}`);
      }

      // Process expenses
      if (identifiedColumns.expense) {
        const expense = parseFinancialValue(rowData[identifiedColumns.expense]);
        totalExpense += expense;
        console.log(`Expense found: ${expense}`);
      }

      // Track products if available
      if (identifiedColumns.product && rowData[identifiedColumns.product]) {
        products.add(rowData[identifiedColumns.product]);
      }

      // Group by month if date column exists
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

    // Trigger audit generation with the new financial data
    console.log('Triggering audit generation...');
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

    // Update financial audit
    const { error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id: user.id,
        monthly_metrics: monthlyMetrics,
        audit_date: new Date().toISOString(),
        summary: `Analyzed spreadsheet ${file.name} with ${analysisResults.summary.total_rows} transactions`,
        kpis: analysisResults.summary,
        recommendations: []
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
