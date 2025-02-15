
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsRequest {
  integration_id: string;
  date?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, date } = await req.json() as MetricsRequest;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999)).toISOString();

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('ecommerce_integrations')
      .select('user_id')
      .eq('id', integration_id)
      .single();

    if (integrationError) throw integrationError;

    // Get daily sales data
    const { data: sales, error: salesError } = await supabase
      .from('ecommerce_sales')
      .select(`
        *,
        ecommerce_products (name, price)
      `)
      .eq('integration_id', integration_id)
      .gte('sale_date', startOfDay)
      .lte('sale_date', endOfDay);

    if (salesError) throw salesError;

    // Calculate metrics
    const dailyRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_price), 0) || 0;
    const totalOrders = new Set(sales?.map(sale => sale.order_id)).size;
    const averageOrderValue = totalOrders > 0 ? dailyRevenue / totalOrders : 0;
    const productsSold = sales?.reduce((sum, sale) => sum + sale.quantity, 0) || 0;

    // Calculate top products
    const productSales = sales?.reduce((acc, sale) => {
      const product = acc.get(sale.product_id) || {
        product_id: sale.product_id,
        name: sale.ecommerce_products.name,
        total_quantity: 0,
        total_revenue: 0,
      };
      
      product.total_quantity += sale.quantity;
      product.total_revenue += Number(sale.total_price);
      acc.set(sale.product_id, product);
      
      return acc;
    }, new Map());

    const topProducts = Array.from(productSales?.values() || [])
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    // Calculate customer metrics
    const { data: customerOrders, error: customerError } = await supabase
      .from('ecommerce_sales')
      .select('order_id, total_price')
      .eq('integration_id', integration_id);

    if (customerError) throw customerError;

    const uniqueCustomers = new Set(customerOrders?.map(order => order.order_id)).size;
    const totalRevenue = customerOrders?.reduce((sum, order) => sum + Number(order.total_price), 0) || 0;
    const customerMetrics = {
      unique_customers: uniqueCustomers,
      average_lifetime_value: uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0,
    };

    // Upsert metrics
    const { error: metricsError } = await supabase
      .from('ecommerce_metrics')
      .upsert({
        integration_id,
        user_id: integration.user_id,
        metric_date: targetDate.toISOString().split('T')[0],
        daily_revenue: dailyRevenue,
        total_orders: totalOrders,
        average_order_value: averageOrderValue,
        products_sold: productsSold,
        top_products: topProducts,
        customer_metrics: customerMetrics,
      });

    if (metricsError) throw metricsError;

    return new Response(
      JSON.stringify({ 
        success: true,
        metrics: {
          daily_revenue: dailyRevenue,
          total_orders: totalOrders,
          average_order_value: averageOrderValue,
          products_sold: productsSold,
          top_products: topProducts,
          customer_metrics: customerMetrics,
        }
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error calculating metrics:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
