
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  integration_id: string;
  platform: string;
  store_url: string;
  credentials: {
    api_key: string;
    api_secret: string;
    access_token?: string;
  };
}

interface Product {
  platform_product_id: string;
  name: string;
  sku?: string;
  price: number;
  cost?: number;
  currency: string;
  inventory_quantity?: number;
}

interface Sale {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  sale_date: string;
}

async function syncShopify(storeUrl: string, credentials: SyncRequest['credentials']) {
  const shopifyDomain = new URL(storeUrl).hostname;
  const headers = {
    'X-Shopify-Access-Token': credentials.access_token,
    'Content-Type': 'application/json',
  };

  // Fetch products
  const productsResponse = await fetch(`https://${shopifyDomain}/admin/api/2024-01/products.json`, {
    headers,
  });

  if (!productsResponse.ok) {
    throw new Error(`Failed to fetch Shopify products: ${productsResponse.statusText}`);
  }

  const productsData = await productsResponse.json();
  
  // Transform Shopify products to our format
  const products: Product[] = productsData.products.map((p: any) => ({
    platform_product_id: p.id.toString(),
    name: p.title,
    sku: p.variants[0]?.sku,
    price: parseFloat(p.variants[0]?.price || '0'),
    inventory_quantity: p.variants[0]?.inventory_quantity,
    currency: 'USD', // Shopify defaults to store currency
  }));

  // Fetch orders (sales)
  const ordersResponse = await fetch(`https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any`, {
    headers,
  });

  if (!ordersResponse.ok) {
    throw new Error(`Failed to fetch Shopify orders: ${ordersResponse.statusText}`);
  }

  const ordersData = await ordersResponse.json();

  // Transform Shopify orders to sales
  const sales: Sale[] = ordersData.orders.flatMap((order: any) => 
    order.line_items.map((item: any) => ({
      order_id: order.id.toString(),
      product_id: item.product_id.toString(),
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      total_price: parseFloat(item.price) * item.quantity,
      currency: order.currency,
      sale_date: order.created_at,
    }))
  );

  return { products, sales };
}

async function syncWooCommerce(storeUrl: string, credentials: SyncRequest['credentials']) {
  const wooApi = `${storeUrl}/wp-json/wc/v3`;
  const auth = btoa(`${credentials.api_key}:${credentials.api_secret}`);
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  };

  // Fetch products
  const productsResponse = await fetch(`${wooApi}/products`, {
    headers,
  });

  if (!productsResponse.ok) {
    throw new Error(`Failed to fetch WooCommerce products: ${productsResponse.statusText}`);
  }

  const productsData = await productsResponse.json();

  // Transform WooCommerce products to our format
  const products: Product[] = productsData.map((p: any) => ({
    platform_product_id: p.id.toString(),
    name: p.name,
    sku: p.sku,
    price: parseFloat(p.price),
    inventory_quantity: p.stock_quantity,
    currency: p.currency || 'USD',
  }));

  // Fetch orders
  const ordersResponse = await fetch(`${wooApi}/orders`, {
    headers,
  });

  if (!ordersResponse.ok) {
    throw new Error(`Failed to fetch WooCommerce orders: ${ordersResponse.statusText}`);
  }

  const ordersData = await ordersResponse.json();

  // Transform WooCommerce orders to sales
  const sales: Sale[] = ordersData.flatMap((order: any) =>
    order.line_items.map((item: any) => ({
      order_id: order.id.toString(),
      product_id: item.product_id.toString(),
      quantity: item.quantity,
      unit_price: parseFloat(item.price),
      total_price: parseFloat(item.total),
      currency: order.currency,
      sale_date: order.date_created,
    }))
  );

  return { products, sales };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { integration_id, platform, store_url, credentials } = await req.json() as SyncRequest;

    // Fetch the user_id for the integration
    const { data: integration, error: integrationError } = await supabase
      .from('ecommerce_integrations')
      .select('user_id')
      .eq('id', integration_id)
      .single();

    if (integrationError) throw integrationError;

    // Platform-specific sync logic
    let syncResult;
    switch (platform) {
      case 'shopify':
        syncResult = await syncShopify(store_url, credentials);
        break;
      case 'woocommerce':
        syncResult = await syncWooCommerce(store_url, credentials);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Begin database transaction to update products and sales
    const { error: productsError } = await supabase.from('ecommerce_products').upsert(
      syncResult.products.map(product => ({
        integration_id,
        user_id: integration.user_id,
        ...product,
      })),
      { onConflict: 'integration_id,platform_product_id' }
    );

    if (productsError) throw productsError;

    const { error: salesError } = await supabase.from('ecommerce_sales').upsert(
      syncResult.sales.map(sale => ({
        integration_id,
        user_id: integration.user_id,
        ...sale,
      })),
      { onConflict: 'integration_id,order_id,product_id' }
    );

    if (salesError) throw salesError;

    // Update last sync timestamp
    const { error: updateError } = await supabase
      .from('ecommerce_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        metadata: { 
          last_sync_result: {
            products_count: syncResult.products.length,
            sales_count: syncResult.sales.length,
            sync_time: new Date().toISOString()
          }
        }
      })
      .eq('id', integration_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        products_synced: syncResult.products.length,
        sales_synced: syncResult.sales.length
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Error in sync-ecommerce function:', error);
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
