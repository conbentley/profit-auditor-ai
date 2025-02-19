
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, websiteType, autoScan, userId } = await req.json()
    console.log('Received request:', { url, websiteType, autoScan, userId })

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

    console.log('Starting mock website analysis for:', url)

    // Generate mock analysis data
    const mockAnalysisData = {
      title: `Analysis of ${url}`,
      description: 'Mock website analysis for testing',
      keywords: ['test', 'mock', 'analysis'],
      pageCount: Math.floor(Math.random() * 50) + 1,
      performance: Math.floor(Math.random() * 100),
      seoScore: Math.floor(Math.random() * 100),
    }

    // Store analysis results
    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert({
        user_id: userId,
        url: url,
        website_type: websiteType,
        auto_scan: autoScan,
        raw_scan_data: mockAnalysisData,
        last_scanned: new Date().toISOString(),
        seo_metrics: {
          title: mockAnalysisData.title,
          description: mockAnalysisData.description,
          keywords: mockAnalysisData.keywords,
          performance: mockAnalysisData.performance,
          seoScore: mockAnalysisData.seoScore
        }
      })

    if (dbError) {
      console.error('Error storing analysis:', dbError)
      throw dbError
    }

    console.log('Mock analysis stored successfully')

    return new Response(
      JSON.stringify({
        status: 'completed',
        message: 'Website analysis completed successfully',
        data: mockAnalysisData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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
