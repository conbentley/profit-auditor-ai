
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, websiteType, autoScan, userId } = await req.json()

    if (!url || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Log the analysis start
    console.log('Starting website analysis for:', url)

    // 1. Scan website using Firecrawl
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
    if (!firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured')
    }

    console.log('Initiating Firecrawl scan...')
    const firecrawlResponse = await fetch('https://api.firecrawl.com/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        limit: 100,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        }
      })
    })

    const websiteData = await firecrawlResponse.json()
    console.log('Website scan completed')

    // 2. Analyze with OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    console.log('Starting AI analysis...')
    const analysisPrompt = `Analyze this business website data and provide:
1. Core business understanding
2. Product/service analysis
3. SEO strengths and weaknesses
4. Competitive positioning
5. Key market differentiators
6. Pricing strategy insights (if available)
7. Customer engagement opportunities
8. Areas for improvement

Website Type: ${websiteType}
Website Content: ${JSON.stringify(websiteData)}

Provide a structured analysis that can be used to enhance business profitability.`

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business analysis AI that provides actionable insights for improving profitability.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
      }),
    })

    const aiAnalysis = await aiResponse.json()
    console.log('AI analysis completed')

    // 3. Store analysis results
    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert({
        user_id: userId,
        url: url,
        website_type: websiteType,
        auto_scan: autoScan,
        raw_scan_data: websiteData,
        ai_analysis: aiAnalysis.choices[0].message.content,
        last_scanned: new Date().toISOString()
      })

    if (dbError) {
      console.error('Error storing analysis:', dbError)
    }

    // 4. Log the completed analysis
    const { error: logError } = await supabaseClient.rpc('log_audit_event', {
      p_user_id: userId,
      p_event_type: 'website_analysis',
      p_metadata: { 
        url, 
        websiteType, 
        autoScan,
        status: 'completed'
      }
    })

    if (logError) {
      console.error('Error logging audit event:', logError)
    }

    // 5. Return the analysis results
    return new Response(
      JSON.stringify({
        status: 'completed',
        url: url,
        websiteType: websiteType,
        autoScan: autoScan,
        websiteData: websiteData,
        aiAnalysis: aiAnalysis.choices[0].message.content
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in analyze-website function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
