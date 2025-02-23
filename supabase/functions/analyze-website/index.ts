
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are an expert business analyst and consultant API. Analyze the ENTIRE website comprehensively, including all pages, sections, and content.

Scan and analyze:
1. ALL pages from navigation menus and site structure
2. ALL products/services across ALL categories and sections
3. ALL pricing information, including:
   - Regular prices
   - Sale prices
   - Bulk discounts
   - Special offers
   - Seasonal promotions
4. Complete business model and revenue streams
5. ALL marketing messages and value propositions
6. Customer journey across the entire site
7. Technical capabilities and features
8. Content strategy and resources
9. Support and service offerings
10. Company information and policies

Return ONLY a JSON object with this structure (no markdown):
{
  "businessType": "detailed business type and market focus",
  "siteStructure": {
    "mainPages": ["list of main navigation pages"],
    "subPages": ["list of sub-pages and sections"],
    "resourcePages": ["list of resources, blogs, documentation"]
  },
  "offerings": ["complete array of ALL products/services with prices"],
  "pricingData": {
    "priceRanges": ["list of price ranges per category"],
    "deals": ["all current deals and promotions"],
    "discounts": ["all discount types and conditions"]
  },
  "businessModel": {
    "revenueStreams": ["all revenue streams identified"],
    "customerSegments": ["identified customer segments"],
    "channels": ["sales and distribution channels"]
  },
  "contentAnalysis": {
    "mainTopics": ["key content themes"],
    "resourceTypes": ["types of content/resources available"],
    "contentGaps": ["missing or underutilized content areas"]
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
    let siteData = "";
    let totalPages = 0;
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
              navigation: [
                'nav', 'header', '.menu', '.navigation', // Navigation containers
                '.nav-item', '.menu-item', // Menu items
                'a[href]:not([href^="#"])' // All non-anchor links
              ],
              products: [
                '.product', '.item', 'article', '.product-item',
                '[data-product]', '[itemtype*="Product"]',
                '.card:has(.price)',
                '.collection-item:has(.price)'
              ],
              prices: [
                '.price', '.amount', '[data-price]',
                '.regular-price', '.sale-price', '.special-price',
                '.was-price', '.now-price',
                '[itemprop="price"]'
              ],
              content: [
                'main', 'article', 'section', // Main content areas
                '.content', '.page-content', // Content containers
                'p', 'h1', 'h2', 'h3', 'h4', // Text content
                '.description', '.details', // Product/service descriptions
                'ul', 'ol', 'dl' // Lists
              ],
              deals: [
                '.sale', '.discount', '.special-offer',
                '.promotion', '.deal', '.offer',
                '.banner:has(.price)', // Promotional banners with prices
                '[class*="discount"]', '[class*="offer"]'
              ]
            },
            maxPages: 500, // Significantly increased page limit
            waitForSelectors: true,
            followLinks: true,
            depth: 5, // Increased depth to catch more pages
            allowedDomains: [new URL(url).hostname], // Stay on the same domain
            // Additional crawling options for comprehensive scan
            options: {
              includeNavigationLinks: true,
              includeImages: true,
              includePrices: true,
              includeMetadata: true,
              followSitemap: true, // Use sitemap.xml if available
              respectRobotsTxt: true
            }
          })
        });
        
        if (crawlResponse.ok) {
          const crawlData = await crawlResponse.json();
          totalProducts = crawlData.products?.length || 0;
          totalPages = crawlData.pages?.length || 0;
          console.log(`Scanned ${totalPages} pages and found ${totalProducts} products`);
          
          // Enhanced site data processing
          const processedData = {
            navigation: {
              mainMenu: crawlData.navigation || [],
              pages: crawlData.pages || []
            },
            products: crawlData.products || [],
            prices: crawlData.prices || [],
            deals: crawlData.deals || [],
            content: crawlData.content || [],
            categories: new Set(crawlData.products?.map((p: any) => p.category)).size
          };
          
          siteData = JSON.stringify(processedData);
        } else {
          console.error('Firecrawl request failed:', await crawlResponse.text());
        }
      }
    } catch (error) {
      console.error('Firecrawl error:', error);
    }

    console.log('Sending enhanced site data to OpenAI for analysis...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `Analyze this website: ${url}\n${siteData ? `Site data (${totalPages} pages, ${totalProducts} products found): ${siteData}\n` : ''}Provide a thorough business analysis. Return ONLY raw JSON matching the specified structure.`
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
        pages_scanned: totalPages,
        offerings_count: totalProducts,
        site_structure: analysisContent.siteStructure || {},
        pricing_data: analysisContent.pricingData || {},
        business_model: analysisContent.businessModel || {},
        content_analysis: analysisContent.contentAnalysis || {},
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
          pages_scanned: totalPages,
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
