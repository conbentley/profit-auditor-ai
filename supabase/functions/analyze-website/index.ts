
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Force the model to return raw JSON with explicit formatting instructions
const systemPrompt = `You are a JSON-only API that analyzes websites.
DO NOT use markdown formatting or code blocks.
DO NOT include any explanatory text.
ONLY return a raw JSON object with this exact structure:
{
  "businessType": "string describing type of business",
  "offerings": ["array of products or services"],
  "targetAudience": "string describing target audience",
  "uniqueSellingPoints": ["array of unique selling points"],
  "pricing": "string with pricing info or null",
  "promotions": ["array of current offers"],
  "keywordTags": ["array of relevant keywords"]
}`;

function cleanJsonResponse(text: string): string {
  // Handle different cases of JSON contamination
  let cleaned = text
    // Remove markdown code blocks
    .replace(/```json\s*|```\s*/g, '')
    // Remove any leading/trailing whitespace
    .trim()
    // Remove any non-JSON text before the first {
    .replace(/^[^{]*({.*})[^}]*$/s, '$1')
    // Clean up any double newlines or spaces
    .replace(/\n+/g, '\n')
    .replace(/\s+/g, ' ');

  console.log('Original response:', text);
  console.log('Cleaned response:', cleaned);
  
  return cleaned;
}

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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('Analyzing website:', url);
    
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
            content: `Analyze this URL: ${url}\nReturn ONLY raw JSON matching the specified structure. NO markdown, NO explanation text.`
          }
        ],
        temperature: 0.5, // Lower temperature for more consistent formatting
        max_tokens: 1500
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
    const rawContent = aiResult.choices[0].message.content;
    
    let analysisContent;
    try {
      // Clean and parse the response
      const cleanedJson = cleanJsonResponse(rawContent);
      analysisContent = JSON.parse(cleanedJson);
      
      // Validate required fields
      const requiredFields = ['businessType', 'offerings', 'targetAudience', 'uniqueSellingPoints', 'keywordTags'];
      const missingFields = requiredFields.filter(field => !(field in analysisContent));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      console.error('Raw AI response:', rawContent);
      return new Response(
        JSON.stringify({
          error: 'Invalid AI response format',
          details: error.message,
          rawResponse: rawContent
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
      raw_scan_data: analysisContent
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
        message: 'Website analysis completed',
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
