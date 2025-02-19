
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are a business analyst AI that analyzes websites. 
Your task is to visit the provided URL and extract key business insights.
Analyze the content and return a structured JSON response with the following information:
- businessType: The type of business and industry
- offerings: Array of products or services offered
- targetAudience: Description of the target audience
- uniqueSellingPoints: Array of unique selling points or value propositions
- pricing: Any pricing information found (or null if not available)
- promotions: Array of current special offers or promotions (or empty array if none)
- keywordTags: Array of relevant keyword tags for the business
Format your response as valid JSON without any additional commentary.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, websiteType, autoScan, userId } = await req.json()
    console.log('Starting website analysis for:', url)

    if (!url || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // 1. Analyze website using OpenAI
    console.log('Initiating OpenAI analysis...')
    
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Please analyze this website: ${url}\n\nProvide a complete analysis focusing on business aspects, target audience, and unique value propositions.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    })

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text()
      console.error('OpenAI API error:', {
        status: openAIResponse.status,
        error: errorText
      })
      throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`)
    }

    const aiResult = await openAIResponse.json()
    const analysisContent = JSON.parse(aiResult.choices[0].message.content)
    
    console.log('AI analysis completed successfully')

    // 2. Store analysis results
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
        keywords: analysisContent.keywordTags || [],
      },
      raw_scan_data: {
        business_type: analysisContent.businessType,
        offerings: analysisContent.offerings,
        target_audience: analysisContent.targetAudience,
        unique_selling_points: analysisContent.uniqueSellingPoints,
        pricing: analysisContent.pricing,
        promotions: analysisContent.promotions,
      }
    }

    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert(analysisData)

    if (dbError) {
      console.error('Error storing analysis:', dbError)
      throw dbError
    }

    console.log('Analysis results stored successfully')

    return new Response(
      JSON.stringify({
        status: 'completed',
        message: 'Website analysis completed successfully',
        data: analysisContent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in analyze-website function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to analyze website',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
