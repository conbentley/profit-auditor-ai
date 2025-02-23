
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are an expert e-commerce business analyst API. Analyze the ENTIRE website comprehensively, with special focus on product catalogs and e-commerce aspects.

Scan and analyze:
1. ALL product categories and subcategories from the main navigation
2. EVERY product listing page and individual product
3. ALL pricing tiers and variations
4. Special sections (new arrivals, bestsellers, deals)
5. ALL shopping features and customer service offerings
6. Payment and shipping options
7. Return policies and warranties
8. Customer support services
9. Technical specifications of products
10. Brand relationships and authorized dealer status

Return ONLY a JSON object with this structure (no markdown):
{
  "businessType": "detailed e-commerce business type",
  "siteStructure": {
    "mainCategories": ["main product categories"],
    "subCategories": ["all subcategories found"],
    "specialSections": ["special sections like deals, new arrivals"],
    "servicePages": ["support, about, contact pages"]
  },
  "productCatalog": {
    "totalProducts": "number of products found",
    "categories": [{
      "name": "category name",
      "productCount": "number of products",
      "priceRange": "price range in category"
    }],
    "featuredBrands": ["list of featured brands"],
    "productTypes": ["types of products offered"]
  },
  "pricingAnalysis": {
    "priceRanges": ["detailed price ranges per category"],
    "activePromotions": ["current promotions and deals"],
    "discountTypes": ["types of discounts offered"],
    "specialOffers": ["special pricing programs"]
  },
  "customerServices": {
    "shippingOptions": ["available shipping methods"],
    "paymentMethods": ["accepted payment types"],
    "returnPolicy": "return policy details",
    "warranties": ["warranty offerings"],
    "support": ["support services"]
  },
  "marketPosition": {
    "competitiveAdvantages": ["unique selling points"],
    "pricePositioning": "price position in market",
    "targetMarket": "target customer segments",
    "brandReputation": "brand positioning analysis"
  },
  "growthOpportunities": [{
    "area": "specific opportunity area",
    "potential": "revenue impact estimate",
    "implementation": "implementation steps",
    "timeframe": "implementation timeline",
    "investment": "required resources"
  }],
  "technicalCapabilities": {
    "ecommerceFeatures": ["available shopping features"],
    "userExperience": ["UX analysis points"],
    "mobileCompatibility": "mobile experience analysis"
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Starting analysis for:', requestBody.url);

    const { url, websiteType, autoScan, userId } = requestBody;
    
    if (!url || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!openAIApiKey || !firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required API keys' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhanced e-commerce specific crawling
    console.log('Starting deep e-commerce crawl...');
    let siteData = {};
    let totalProducts = 0;
    let categories = new Set();

    try {
      const crawlResponse = await fetch('https://api.firecrawl.net/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          // E-commerce specific selectors
          selectors: {
            navigation: [
              'nav', '.navigation', '#nav', '#menu', '.menu',
              '.category-nav', '.main-nav', '.product-categories',
              '[class*="nav"]', '[class*="menu"]', '[role="navigation"]'
            ],
            categories: [
              '.category', '.department', '.product-category',
              '[class*="category"]', '[class*="department"]',
              'nav a', '.menu a', '.navigation a'
            ],
            products: [
              '.product', '.item', '[data-product]', '[itemtype*="Product"]',
              '.product-item', '.product-card', '.product-grid-item',
              '[class*="product"]', '[id*="product"]',
              'article', '.card:has(.price)', '.item:has(.price)'
            ],
            prices: [
              '.price', '[class*="price"]', '[data-price]',
              '.regular-price', '.special-price', '.sale-price',
              '[itemprop="price"]', '.amount', '.current-price',
              '.was-price', '.now-price', '.discount-price'
            ],
            productDetails: [
              '.product-details', '.product-info', '.description',
              '[itemprop="description"]', '.specifications', '.features',
              '.product-specs', '.tech-specs', '.details'
            ]
          },
          // Advanced crawling configuration
          options: {
            maxPages: 2000, // Increased for large catalogs
            maxProducts: 5000, // Allow more products
            depth: 10, // Deep crawl
            parallel: 5, // Parallel requests
            waitForSelectors: true,
            followLinks: true,
            includeNavigationLinks: true,
            includePrices: true,
            includeMetadata: true,
            followSitemap: true,
            useSitemapXml: true,
            respectRobotsTxt: true,
            // E-commerce specific options
            crawlProductPages: true,
            extractProductData: true,
            followCategoryLinks: true,
            followPagination: true
          },
          // Additional configuration
          allowedPaths: [
            '/products', '/category', '/shop', '/catalog',
            '/collections', '/brands', '/deals', '/sale'
          ],
          // Custom headers to avoid being blocked
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
          }
        })
      });

      if (crawlResponse.ok) {
        const crawlData = await crawlResponse.json();
        console.log('Crawl completed, processing data...');

        // Process categories
        const categorySet = new Set();
        crawlData.navigation?.forEach((nav: any) => {
          if (nav.href && !nav.href.includes('#')) {
            categorySet.add(nav.href);
          }
        });

        // Process products
        const processedProducts = new Map();
        crawlData.products?.forEach((product: any) => {
          if (product.id || product.url) {
            const key = product.id || product.url;
            if (!processedProducts.has(key)) {
              processedProducts.set(key, product);
            }
          }
        });

        totalProducts = processedProducts.size;
        console.log(`Processed ${totalProducts} unique products`);

        siteData = {
          navigation: Array.from(categorySet),
          products: Array.from(processedProducts.values()),
          prices: crawlData.prices || [],
          productDetails: crawlData.productDetails || [],
          categories: crawlData.categories || []
        };
      } else {
        console.error('Crawl failed:', await crawlResponse.text());
      }
    } catch (error) {
      console.error('Crawl error:', error);
    }

    console.log('Starting AI analysis...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze this e-commerce website: ${url}\nSite data: ${JSON.stringify(siteData)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!openAIResponse.ok) {
      throw new Error(await openAIResponse.text());
    }

    const aiResult = await openAIResponse.json();
    const analysisContent = JSON.parse(aiResult.choices[0].message.content.trim());

    // Store results
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const analysisData = {
      user_id: userId,
      url: url,
      website_type: websiteType || 'ecommerce',
      auto_scan: autoScan,
      last_scanned: new Date().toISOString(),
      ai_analysis: JSON.stringify(analysisContent),
      seo_metrics: {
        product_count: totalProducts,
        category_count: categories.size,
        indexed_urls: siteData.navigation?.length || 0
      },
      competitor_data: {
        market_position: analysisContent.marketPosition || {},
        growth_opportunities: analysisContent.growthOpportunities || []
      },
      raw_scan_data: {
        product_catalog: analysisContent.productCatalog || {},
        pricing_analysis: analysisContent.pricingAnalysis || {},
        customer_services: analysisContent.customerServices || {},
        technical_capabilities: analysisContent.technicalCapabilities || {}
      }
    };

    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert(analysisData);

    if (dbError) {
      throw dbError;
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'E-commerce analysis completed',
        stats: {
          products_found: totalProducts,
          categories_found: categories.size,
          urls_processed: siteData.navigation?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
