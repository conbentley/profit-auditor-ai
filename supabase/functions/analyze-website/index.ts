
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
      console.error('Firecrawl API key not found in environment variables')
      throw new Error('Firecrawl API key not configured')
    }

    console.log('Initiating Firecrawl scan...')
    
    // Create the request with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, 30000) // 30 second timeout

    try {
      const firecrawlResponse = await fetch('https://api.firecrawl.com/crawl', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Supabase Edge Function'
        },
        body: JSON.stringify({
          url,
          limit: 100,
          scrapeOptions: {
            formats: ['markdown', 'html'],
          }
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!firecrawlResponse.ok) {
        const errorText = await firecrawlResponse.text()
        console.error('Firecrawl API error:', {
          status: firecrawlResponse.status,
          statusText: firecrawlResponse.statusText,
          error: errorText
        })
        throw new Error(`Firecrawl API error: ${firecrawlResponse.status} - ${errorText}`)
      }

      const websiteData = await firecrawlResponse.json()
      console.log('Website scan completed successfully')

      // 2. Store scan results with mock data if the scan fails
      const analysisData = {
        user_id: userId,
        url: url,
        website_type: websiteType,
        auto_scan: autoScan,
        raw_scan_data: websiteData || {},
        last_scanned: new Date().toISOString(),
        seo_metrics: {
          title: websiteData?.title || url,
          description: websiteData?.description || 'Website analysis pending',
          keywords: websiteData?.keywords || [],
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
          message: 'Website analysis completed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (fetchError) {
      clearTimeout(timeout)
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout - Firecrawl API took too long to respond')
      }
      throw fetchError
    }

  } catch (error) {
    console.error('Error in analyze-website function:', error)
    
    // Create a basic analysis entry even if the scan fails
    try {
      const { error: fallbackError } = await supabaseClient
        .from('website_analysis')
        .upsert({
          user_id: userId,
          url: url,
          website_type: websiteType,
          auto_scan: autoScan,
          last_scanned: new Date().toISOString(),
          seo_metrics: {
            title: url,
            description: 'Website analysis failed - will retry later',
            keywords: [],
          }
        })

      if (fallbackError) {
        console.error('Error storing fallback analysis:', fallbackError)
      }
    } catch (fallbackError) {
      console.error('Error in fallback storage:', fallbackError)
    }

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
