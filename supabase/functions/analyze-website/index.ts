
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are an expert business analyst and consultant API that provides deep, actionable insights for businesses. Your analysis must be detailed and specific, focusing on real business value and competitive advantages.

Analyze the website content thoroughly, looking for:
1. ALL products and services (do not limit your analysis, scan the entire catalog)
2. Pricing strategies and models
3. Market positioning
4. Competitive advantages
5. Customer pain points being addressed
6. Growth opportunities
7. Revenue optimization potential
8. Market differentiation factors
9. Brand messaging effectiveness
10. Customer acquisition channels

Return ONLY a JSON object with this structure (no markdown):
{
  "businessType": "detailed business type and market focus",
  "offerings": ["complete array of ALL products/services found"],
  "targetAudience": "detailed target market analysis",
  "uniqueSellingPoints": ["comprehensive array of unique value propositions"],
  "pricingStrategy": "detailed pricing model analysis",
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
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // First, let's crawl the product pages to get a comprehensive list
    let productData = "";
    try {
      const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (firecrawlApiKey) {
        console.log('Initiating Firecrawl scan for product data...');
        const crawlResponse = await fetch('https://api.firecrawl.net/crawl', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${firecrawlApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url,
            selectors: {
              products: '.product, .item, article, .product-item', // Common product selectors
              prices: '.price, .amount, [data-price]',
              titles: '.product-title, .item-title, h1, h2, h3'
            },
            maxPages: 100 // Scan up to 100 pages
          })
        });
        
        if (crawlResponse.ok) {
          const crawlData = await crawlResponse.json();
          productData = JSON.stringify(crawlData);
          console.log(`Found ${crawlData.products?.length || 0} products through crawling`);
        }
      }
    } catch (error) {
      console.error('Firecrawl error:', error);
      // Continue with analysis even if crawl fails
    }

    console.log('Sending data to OpenAI for analysis...');
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemPrompt 
          },
          { 
            role: 'user', 
            content: `Analyze this URL: ${url}\n${productData ? `Additional product data: ${productData}\n` : ''}Provide a thorough business analysis. Return ONLY raw JSON matching the specified structure.`
          }
        ],
        temperature: 0.3, // Lower temperature for more factual analysis
        max_tokens: 4000  // Increased token limit for comprehensive analysis
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

    // Validate the analysis has found a reasonable number of offerings
    if (!analysisContent.offerings || analysisContent.offerings.length < 10) {
      console.warn('Warning: Low number of offerings detected:', analysisContent.offerings?.length);
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
        offerings_count: analysisContent.offerings?.length || 0,
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
        data: analysisContent
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
