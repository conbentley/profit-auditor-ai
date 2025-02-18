
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { uploadId } = await req.json();
    if (!uploadId) {
      throw new Error('No upload ID provided');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the upload record
    const { data: upload, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .select('*')
      .eq('id', uploadId)
      .single();

    if (uploadError || !upload) {
      throw new Error('Upload not found');
    }

    // Get the file from storage
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('spreadsheets')
      .download(upload.file_path);

    if (fileError || !fileData) {
      throw new Error('File not found in storage');
    }

    // Convert the file data to text
    const text = await fileData.text();
    const rows = text.split('\n').map(row => row.split(','));
    const headers = rows[0];
    const data = rows.slice(1).map(row => 
      Object.fromEntries(headers.map((header, i) => [header, row[i]]))
    );

    // Analyze with OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a financial auditor AI. Analyze the financial data and provide insights in the following JSON format:
            {
              "summary": "Brief overview of the financial data",
              "metrics": {
                "total_revenue": number,
                "total_expenses": number,
                "profit_margin": number,
                "expense_ratio": number
              },
              "insights": ["Array of key insights"],
              "recommendations": ["Array of actionable recommendations"]
            }`
          },
          {
            role: 'user',
            content: `Analyze this financial data: ${JSON.stringify(data)}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Update the upload record with analysis results
    const { error: updateError } = await supabase
      .from('spreadsheet_uploads')
      .update({
        processed: true,
        analysis_results: analysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', uploadId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing spreadsheet:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Error processing spreadsheet' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
