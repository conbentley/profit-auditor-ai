
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

    console.log('Initiating Firecrawl scan with API key:', firecrawlApiKey.substring(0, 4) + '...')
    
    const firecrawlResponse = await fetch('https://api.firecrawl.com/crawl', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase Edge Function'
      },
      body: JSON.stringify({
        url,
        limit: 100,
        scrapeOptions: {
          formats: ['markdown', 'html'],
        }
      })
    })

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

    // 2. Store scan results
    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert({
        user_id: userId,
        url: url,
        website_type: websiteType,
        auto_scan: autoScan,
        raw_scan_data: websiteData,
        last_scanned: new Date().toISOString(),
        seo_metrics: {
          title: websiteData.title || '',
          description: websiteData.description || '',
          keywords: websiteData.keywords || [],
        }
      })

    if (dbError) {
      console.error('Error storing analysis:', dbError)
      throw dbError
    }

    console.log('Analysis results stored successfully')

    // Return success response
    return new Response(
      JSON.stringify({
        status: 'completed',
        message: 'Website analysis completed successfully'
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
