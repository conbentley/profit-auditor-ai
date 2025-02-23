
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are an expert business analyst and consultant API. Your task is to provide an exhaustive analysis of ALL products, pricing, and business aspects of the website.

Scan and analyze:
1. ALL products in the catalog (list every single product found)
2. ALL pricing data (regular prices, sale prices, discounts)
3. ALL deals and promotions
4. Product categories and organization
5. Pricing strategies across different categories
6. Cross-selling and upselling opportunities
7. Customer journey and conversion points
8. Market positioning and competitor differentiation
9. Revenue optimization opportunities
10. Brand messaging and value propositions

Return ONLY a JSON object with this structure (no markdown):
{
  "businessType": "detailed business type and market focus",
  "offerings": ["complete array of ALL products/services found with prices"],
  "pricingData": {
    "priceRanges": ["list of price ranges per category"],
    "deals": ["all current deals and promotions"],
    "discounts": ["all discount types and conditions"]
  },
  "targetAudience": "detailed target market analysis",
  "uniqueSellingPoints": ["comprehensive array of unique value propositions"],
  "pricingStrategy": {
    "overall": "main pricing strategy",
    "categorySpecific": ["pricing strategies per category"],
    "competitivePosition": "price positioning vs competitors"
  },
  "competitiveAdvantages": ["specific competitive advantages"],
  "growthOpportunities": [{
    "opportunity": "specific growth opportunity",
    "impact": "estimated revenue impact percentage",
    "implementation": "specific implementation steps",
    "timeframe": "estimated implementation timeframe",
    "resources": "required resources"
  }],
  "marketPositioning": "detailed market position analysis",
  "customerPainPoints": ["specific customer problems solved"],
  "revenuePotential": [{
    "stream": "revenue stream name",
    "potential": "estimated revenue potential",
    "requirements": "implementation requirements"
  }],
  "brandAnalysis": {
    "strengths": ["brand strengths"],
    "improvement_areas": ["areas needing improvement"],
    "market_perception": "analysis of market perception"
  }
}`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Received request:', JSON.stringify(requestBody, null, 2));
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format', details: error.message }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { url, websiteType, autoScan, userId } = requestBody;
    
    if (!url || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields (url, userId)' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Starting comprehensive website analysis:', url);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhanced website crawling
    let productData = "";
    let totalProducts = 0;
    try {
      if (firecrawlApiKey) {
        console.log('Starting comprehensive Firecrawl scan...');
        const crawlResponse = await fetch('https://api.firecrawl.net/crawl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            selectors: {
              products: [
                '.product', '.item', 'article', '.product-item', // Common product containers
                '[data-product]', '[itemtype*="Product"]', // Schema.org and data attributes
                '.card:has(.price)', // Cards containing prices
                '.collection-item:has(.price)' // Collection items with prices
              ],
              prices: [
                '.price', '.amount', '[data-price]', // Basic price elements
                '.regular-price', '.sale-price', '.special-price', // Different price types
                '.was-price', '.now-price', // Sale indicators
                '[itemprop="price"]' // Schema.org price
              ],
              titles: [
                '.product-title', '.item-title', 'h1', 'h2', 'h3',
                '[itemprop="name"]', // Schema.org name
                '.product-name', '.item-name' // Common name classes
              ],
              descriptions: [
                '.description', '.product-description',
                '[itemprop="description"]',
                '.details', '.specs'
              ],
              deals: [
                '.sale', '.discount', '.special-offer',
                '.promotion', '.deal', '.offer'
              ]
            },
            maxPages: 200, // Increased page limit for thorough scanning
            waitForSelectors: true, // Ensure dynamic content is loaded
            followLinks: true, // Crawl linked pages
            depth: 3 // Crawl up to 3 levels deep
          })
        });
        
        if (crawlResponse.ok) {
          const crawlData = await crawlResponse.json();
          totalProducts = crawlData.products?.length || 0;
          console.log(`Found ${totalProducts} products through crawling`);
          
          // Enhanced product data processing
          const processedData = {
            products: crawlData.products || [],
            prices: crawlData.prices || [],
            deals: crawlData.deals || [],
            categories: new Set(crawlData.products?.map((p: any) => p.category)).size
          };
          
          productData = JSON.stringify(processedData);
        } else {
          console.error('Firecrawl request failed:', await crawlResponse.text());
        }
      }
    } catch (error) {
      console.error('Firecrawl error:', error);
      // Continue with analysis even if crawl fails
    }

    console.log('Sending enhanced data to OpenAI for analysis...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fixed model name
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `Analyze this URL: ${url}\n${productData ? `Product data (${totalProducts} products found): ${productData}\n` : ''}Provide a thorough business analysis. Return ONLY raw JSON matching the specified structure.`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      })
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const aiResult = await openAIResponse.json();
    const analysisContent = JSON.parse(aiResult.choices[0].message.content.trim());

    // Validate analysis completeness
    if (!analysisContent.offerings || analysisContent.offerings.length < totalProducts) {
      console.warn('Warning: Analysis found fewer products than crawler:', {
        crawledProducts: totalProducts,
        analyzedProducts: analysisContent.offerings?.length
      });
    }

    // Store analysis results
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const analysisData = {
      user_id: userId,
      url: url,
      website_type: websiteType || analysisContent.businessType,
      auto_scan: autoScan,
      last_scanned: new Date().toISOString(),
      ai_analysis: JSON.stringify(analysisContent),
      seo_metrics: {
        title: url,
        description: analysisContent.uniqueSellingPoints?.join('. ') || '',
        keywords: analysisContent.brandAnalysis?.strengths || [],
      },
      competitor_data: {
        advantages: analysisContent.competitiveAdvantages || [],
        market_position: analysisContent.marketPositioning || '',
        growth_opportunities: analysisContent.growthOpportunities || []
      },
      raw_scan_data: {
        offerings_count: totalProducts,
        pricing_data: analysisContent.pricingData || {},
        pricing_strategy: analysisContent.pricingStrategy || '',
        revenue_potential: analysisContent.revenuePotential || [],
        customer_pain_points: analysisContent.customerPainPoints || []
      }
    };

    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert(analysisData);

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: 'success',
        message: 'Comprehensive website analysis completed',
        data: analysisContent,
        stats: {
          products_found: totalProducts,
          analysis_completed: true
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
