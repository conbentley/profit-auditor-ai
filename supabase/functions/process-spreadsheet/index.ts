import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnType {
  type: 'product_name' | 'units' | 'sale_price' | 'cost_price' | 'revenue' | 'cost' | 'date' | 'category' | 'other';
  index: number;
}

interface ProductMetrics {
  name: string;
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  averagePrice: number;
}

function identifyColumns(headers: string[]): ColumnType[] {
  console.log('Attempting to identify columns from headers:', headers);
  
  return headers.map((header, index) => {
    const headerLower = header.toLowerCase().trim();
    console.log(`Analyzing header: "${headerLower}" at index ${index}`);
    
    if (
      headerLower.includes('product') || 
      headerLower.includes('item') || 
      headerLower.includes('name') ||
      headerLower.includes('description') ||
      headerLower.includes('sku') ||
      headerLower.includes('goods')
    ) {
      console.log(`Found product name column: "${header}"`);
      return { type: 'product_name', index };
    }
    
    if (headerLower.includes('units') || headerLower.includes('quantity') || headerLower.includes('sold') || headerLower.includes('qty')) {
      return { type: 'units', index };
    }
    if (headerLower.includes('sale price') || headerLower.includes('unit price') || headerLower.includes('selling price') || headerLower.match(/price(?!\s*cost)/)) {
      return { type: 'sale_price', index };
    }
    if (headerLower.includes('cost price') || headerLower.includes('unit cost') || headerLower.includes('buying price')) {
      return { type: 'cost_price', index };
    }
    if (headerLower.includes('date') || headerLower.includes('period')) {
      return { type: 'date', index };
    }
    if (headerLower.includes('category') || headerLower.includes('type')) {
      return { type: 'category', index };
    }
    if (headerLower.includes('total revenue') || headerLower.includes('revenue') || headerLower.includes('sales')) {
      return { type: 'revenue', index };
    }
    if (headerLower.includes('total cost') || headerLower.includes('cost')) {
      return { type: 'cost', index };
    }
    return { type: 'other', index };
  });
}

function extractNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]+/g, '');
    return Number(cleaned) || 0;
  }
  return 0;
}

function generateInsights(productMetrics: ProductMetrics[], totalRevenue: number) {
  const sortedByRevenue = [...productMetrics].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const sortedByUnits = [...productMetrics].sort((a, b) => b.totalUnits - a.totalUnits);
  const sortedByProfit = [...productMetrics].sort((a, b) => b.profit - a.profit);
  const sortedByMargin = [...productMetrics].sort((a, b) => b.profitMargin - a.profitMargin);

  const insights = [
    "Product Performance Analysis:",
    "",
    "Top Performing Products by Revenue:",
    ...sortedByRevenue.slice(0, 3).map(p => 
      `- ${p.name}: £${p.totalRevenue.toFixed(2)} (${((p.totalRevenue/totalRevenue)*100).toFixed(1)}% of total revenue)`
    ),
    "",
    "Best Sellers by Units:",
    ...sortedByUnits.slice(0, 3).map(p => 
      `- ${p.name}: ${p.totalUnits} units`
    ),
    "",
    "Most Profitable Products:",
    ...sortedByProfit.slice(0, 3).map(p => 
      `- ${p.name}: £${p.profit.toFixed(2)} profit (${p.profitMargin.toFixed(1)}% margin)`
    ),
    "",
    "Highest Margin Products:",
    ...sortedByMargin.slice(0, 3).map(p => 
      `- ${p.name}: ${p.profitMargin.toFixed(1)}% margin`
    ),
  ];

  const lowMarginProducts = productMetrics.filter(p => p.profitMargin < 20);
  const highVolumeProducts = sortedByUnits.slice(0, 3);
  
  if (lowMarginProducts.length > 0) {
    insights.push(
      "",
      "Pricing Optimization Opportunities:",
      ...lowMarginProducts.map(p => 
        `- Consider reviewing pricing for ${p.name} (current margin: ${p.profitMargin.toFixed(1)}%)`
      )
    );
  }

  if (highVolumeProducts.length > 0) {
    insights.push(
      "",
      "Volume-based Opportunities:",
      ...highVolumeProducts.map(p => 
        `- Potential bulk purchasing opportunity for ${p.name} to reduce costs`
      )
    );
  }

  return insights;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    console.log('Starting to process upload:', uploadId);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: upload, error: uploadError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .select('*, user_id')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error(uploadError?.message || 'Upload not found');
    }

    const { data: allUploads, error: allUploadsError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .select('*')
      .eq('user_id', upload.user_id)
      .eq('processed', true);

    if (allUploadsError) {
      console.error('Error fetching all uploads:', allUploadsError);
    }

    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Failed to download file');
    }

    let rows = [];
    let headers = [];

    try {
      if (upload.file_type === 'csv') {
        const text = await fileData.text();
        const lines = text.split('\n');
        headers = lines[0].split(',').map(header => header.trim());
        rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => line.split(',').map(cell => cell.trim()));
      } else {
        const arrayBuffer = await fileData.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        headers = data[0].map(header => String(header || '').trim());
        rows = data.slice(1).filter(row => row.length === headers.length);
      }
    } catch (error) {
      throw new Error(`Failed to parse file: ${error.message}`);
    }

    console.log('Found headers:', headers);
    const columns = identifyColumns(headers);
    console.log('Identified column types:', columns);

    const productNameCol = columns.find(col => col.type === 'product_name');
    
    if (!productNameCol) {
      console.log('No product name column identified, using first column as fallback');
      columns[0] = { type: 'product_name', index: 0 };
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const productMap = new Map<string, ProductMetrics>();
    const warnings = [];

    if (!productNameCol) {
      warnings.push('Could not definitively identify product name column, using first column as product names. Please verify data accuracy.');
    }

    const unitsCol = columns.find(col => col.type === 'units');
    const salePriceCol = columns.find(col => col.type === 'sale_price');
    const costPriceCol = columns.find(col => col.type === 'cost_price');

    rows.forEach((row, rowIndex) => {
      const productName = (productNameCol ? row[productNameCol.index] : row[0])?.toString() || `Product ${rowIndex + 1}`;
      const units = unitsCol ? extractNumber(row[unitsCol.index]) : 0;
      const salePrice = salePriceCol ? extractNumber(row[salePriceCol.index]) : 0;
      const costPrice = costPriceCol ? extractNumber(row[costPriceCol.index]) : 0;

      if (rowIndex === 0) {
        console.log('Sample row data:', {
          productName,
          rowData: row,
          identifiedColumns: columns.map(col => ({ type: col.type, value: row[col.index] }))
        });
      }

      const revenue = units * salePrice;
      const cost = units * costPrice;
      const profit = revenue - cost;

      totalRevenue += revenue;
      totalCost += cost;

      if (!productMap.has(productName)) {
        productMap.set(productName, {
          name: productName,
          totalUnits: 0,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          profitMargin: 0,
          averagePrice: 0
        });
      }

      const metrics = productMap.get(productName)!;
      metrics.totalUnits += units;
      metrics.totalRevenue += revenue;
      metrics.totalCost += cost;
      metrics.profit += profit;
      metrics.profitMargin = (metrics.profit / metrics.totalRevenue) * 100;
      metrics.averagePrice = metrics.totalRevenue / metrics.totalUnits;
    });

    const productMetrics = Array.from(productMap.values());
    const insights = generateInsights(productMetrics, totalRevenue);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const analysis = {
      total_rows: rows.length,
      financial_metrics: {
        total_revenue: totalRevenue,
        total_cost: totalCost,
        total_profit: totalProfit,
        profit_margin: profitMargin
      },
      product_analysis: productMetrics,
      headers: headers,
      column_types: columns,
      warnings: warnings,
      insights: insights,
      sample_data: rows.slice(0, 3),
      processed_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysis,
        analyzed_at: new Date().toISOString(),
        row_count: rows.length,
        processing_error: null
      })
      .eq('id', uploadId);

    if (updateError) {
      throw new Error(`Failed to save analysis results: ${updateError.message}`);
    }

    try {
      await supabaseAdmin.functions.invoke('generate-audit', {
        body: { 
          user_id: upload.user_id,
          force_update: true
        }
      });
    } catch (auditError) {
      console.error('Error triggering audit update:', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "If the error persists, please ensure your spreadsheet has clear column headers for product names, quantities, and prices."
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
