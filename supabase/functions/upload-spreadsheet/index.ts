
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProcessedData {
  totalRevenue: number;
  totalCost: number;
  transactionCount: number;
  transactions: any[];
  productSummary: Map<string, { units: number; revenue: number; cost: number }>;
}

function normalizeColumnName(header: string): string {
  const normalized = header.toLowerCase().trim();
  if (normalized.includes('sku') || normalized.includes('product')) return 'sku';
  if (normalized.includes('cogs') || normalized.includes('cost')) return 'cost';
  if (normalized.includes('revenue') || normalized.includes('sales')) return 'revenue';
  if (normalized.includes('quantity') || normalized.includes('units')) return 'units';
  if (normalized.includes('price')) return 'price';
  return normalized;
}

function processSpreadsheetData(data: any[]): ProcessedData {
  if (!data || data.length === 0) {
    console.log('No data to process');
    return { 
      totalRevenue: 0, 
      totalCost: 0, 
      transactionCount: 0, 
      transactions: [], 
      productSummary: new Map() 
    };
  }

  // Map original headers to normalized ones
  const headerMap = new Map<string, string>();
  const originalHeaders = Object.keys(data[0]);
  originalHeaders.forEach(header => {
    headerMap.set(header, normalizeColumnName(header));
  });

  console.log('Column mapping:', Object.fromEntries(headerMap));

  let totalRevenue = 0;
  let totalCost = 0;
  const transactions = [];
  const productSummary = new Map<string, { units: number; revenue: number; cost: number }>();

  data.forEach((row, index) => {
    let sku = '';
    let revenue = 0;
    let cost = 0;
    let units = 0;
    let price = 0;

    // Find values using normalized headers
    for (const [originalHeader, value] of Object.entries(row)) {
      const normalizedHeader = headerMap.get(originalHeader);
      if (!normalizedHeader) continue;

      const numValue = typeof value === 'string' ? parseFloat(value.replace(/[£$,]/g, '')) : parseFloat(value);

      switch (normalizedHeader) {
        case 'sku':
          sku = value.toString();
          break;
        case 'revenue':
          if (!isNaN(numValue)) revenue = numValue;
          break;
        case 'cost':
          if (!isNaN(numValue)) cost = numValue;
          break;
        case 'units':
          if (!isNaN(numValue)) units = numValue;
          break;
        case 'price':
          if (!isNaN(numValue)) price = numValue;
          break;
      }
    }

    // Calculate revenue if not directly provided
    if (revenue === 0 && units > 0 && price > 0) {
      revenue = units * price;
    }

    // Only process rows with valid SKU and either revenue or cost
    if (sku && (revenue > 0 || cost > 0 || units > 0)) {
      // Update product summary
      const existing = productSummary.get(sku) || { units: 0, revenue: 0, cost: 0 };
      productSummary.set(sku, {
        units: existing.units + (units || 1),
        revenue: existing.revenue + revenue,
        cost: existing.cost + cost
      });

      totalRevenue += revenue;
      totalCost += cost;

      transactions.push({
        sku,
        revenue,
        cost,
        units: units || 1,
        price,
        row_index: index + 1
      });
    }
  });

  // Log processing results
  console.log('Processing summary:', {
    total_rows: data.length,
    processed_transactions: transactions.length,
    total_revenue: totalRevenue,
    total_cost: totalCost,
    unique_products: productSummary.size,
    sample_products: Array.from(productSummary.entries()).slice(0, 3).map(([sku, stats]) => ({
      sku,
      units: stats.units,
      revenue: stats.revenue
    }))
  });

  return {
    totalRevenue,
    totalCost,
    transactionCount: transactions.length,
    transactions,
    productSummary
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file uploaded');
    }

    console.log('Processing file:', file.name);

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Process all sheets
    let combinedData: ProcessedData = {
      totalRevenue: 0,
      totalCost: 0,
      transactionCount: 0,
      transactions: [],
      productSummary: new Map()
    };

    for (const sheetName of workbook.SheetNames) {
      console.log('Processing sheet:', sheetName);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      if (data.length > 0) {
        const sheetData = processSpreadsheetData(data);
        combinedData.totalRevenue += sheetData.totalRevenue;
        combinedData.totalCost += sheetData.totalCost;
        combinedData.transactionCount += sheetData.transactionCount;
        combinedData.transactions = [
          ...combinedData.transactions,
          ...sheetData.transactions.map(t => ({ ...t, sheet: sheetName }))
        ];

        // Merge product summaries
        sheetData.productSummary.forEach((value, key) => {
          const existing = combinedData.productSummary.get(key) || { units: 0, revenue: 0, cost: 0 };
          combinedData.productSummary.set(key, {
            units: existing.units + value.units,
            revenue: existing.revenue + value.revenue,
            cost: existing.cost + value.cost
          });
        });
      }
    }

    // Convert product summary to array and sort by units sold
    const topProducts = Array.from(combinedData.productSummary.entries())
      .map(([sku, stats]) => ({
        sku,
        units: stats.units,
        revenue: stats.revenue,
        cost: stats.cost,
        profit_margin: stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0
      }))
      .sort((a, b) => b.units - a.units);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        processed: true,
        row_count: combinedData.transactions.length,
        data_summary: {
          total_revenue: combinedData.totalRevenue,
          total_expenses: combinedData.totalCost,
          transaction_count: combinedData.transactionCount,
          top_products: topProducts.slice(0, 5),
          profit_margin: combinedData.totalRevenue > 0 
            ? ((combinedData.totalRevenue - combinedData.totalCost) / combinedData.totalRevenue) * 100 
            : 0
        }
      })
      .select()
      .single();

    if (uploadError) {
      throw uploadError;
    }

    console.log('Upload processed successfully:', {
      filename: file.name,
      transactions: combinedData.transactionCount,
      revenue: combinedData.totalRevenue,
      top_products: topProducts.slice(0, 3).map(p => ({ 
        sku: p.sku, 
        units: p.units,
        revenue: p.revenue 
      }))
    });

    return new Response(
      JSON.stringify({ 
        message: 'File processed successfully',
        data: uploadData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
