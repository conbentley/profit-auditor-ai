
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `You are a business analyst AI that analyzes websites. 
Your task is to visit the provided URL and extract key business insights.
Analyze the content and return a structured JSON response with ONLY the following fields (no markdown formatting, no backticks, just raw JSON):
{
  "businessType": "type of business and industry",
  "offerings": ["array of products or services"],
  "targetAudience": "description of target audience",
  "uniqueSellingPoints": ["array of unique selling points"],
  "pricing": "pricing information or null",
  "promotions": ["array of current offers"],
  "keywordTags": ["relevant keyword tags"]
}`;

function cleanJsonResponse(response: string): string {
  // Remove markdown backticks and json keyword if present
  return response.replace(/```json\n?|\n?```/g, '').trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Safely parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Received request body:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON format in request', 
          details: parseError.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    const { url, websiteType, autoScan, userId } = requestBody;
    
    if (!url || !userId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: 'URL and userId are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Starting website analysis for:', url);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuration error',
          details: 'OpenAI API key not configured'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Analyze website using OpenAI
    console.log('Initiating OpenAI analysis...');
    
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
            content: `Analyze this website: ${url}\nReturn ONLY a JSON object with the specified fields, no markdown formatting or explanation needed.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', {
        status: openAIResponse.status,
        error: errorText
      });
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI API error',
          details: `${openAIResponse.status} - ${errorText}`
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const aiResult = await openAIResponse.json();
    
    // Clean and parse OpenAI response
    let analysisContent;
    try {
      const cleanedResponse = cleanJsonResponse(aiResult.choices[0].message.content);
      console.log('Cleaned response:', cleanedResponse);
      analysisContent = JSON.parse(cleanedResponse);
      console.log('AI analysis completed successfully:', JSON.stringify(analysisContent, null, 2));
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid AI response format',
          details: parseError.message,
          raw_response: aiResult.choices[0].message.content
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Store analysis results
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
    };

    const { error: dbError } = await supabaseClient
      .from('website_analysis')
      .upsert(analysisData);

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ 
          error: 'Database error',
          details: dbError.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Analysis results stored successfully');

    return new Response(
      JSON.stringify({
        status: 'completed',
        message: 'Website analysis completed successfully',
        data: analysisContent
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in analyze-website function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
