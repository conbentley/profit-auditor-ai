
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url, websiteType, autoScan, userId } = await req.json()

    // Validate inputs
    if (!url || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key
    const supabaseClient = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Log the analysis request
    const { error: logError } = await supabaseClient.rpc('log_audit_event', {
      p_user_id: userId,
      p_event_type: 'website_analysis',
      p_metadata: { url, websiteType, autoScan }
    })

    if (logError) {
      console.error('Error logging audit event:', logError)
    }

    // For now, return a mock analysis result
    // In a real implementation, you would:
    // 1. Fetch and parse the website content
    // 2. Use AI to analyze the content
    // 3. Store the results in the database
    const mockAnalysis = {
      status: 'completed',
      url: url,
      websiteType: websiteType,
      autoScan: autoScan,
      analysis: {
        businessType: websiteType,
        keyFeatures: ['Products', 'Services', 'Contact Information'],
        lastScanned: new Date().toISOString()
      }
    }

    return new Response(
      JSON.stringify(mockAnalysis),
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
