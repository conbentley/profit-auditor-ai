
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { read, utils } from 'https://esm.sh/xlsx@0.18.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

async function analyzeWithGPT(data: any[]) {
  try {
    const dataString = JSON.stringify(data, null, 2);
    
    const prompt = `
    Analyze this financial data and provide:
    1. Total revenue, costs, and profit
    2. Key metrics like profit margin and expense ratio
    3. A brief executive summary
    4. 2-3 actionable recommendations
    
    The data is in JSON format:
    ${dataString}

    Respond in this exact JSON format:
    {
      "metrics": {
        "total_revenue": number,
        "total_costs": number,
        "profit_margin": number,
        "expense_ratio": number
      },
      "summary": "string",
      "kpis": [
        {
          "metric": "string",
          "value": "string",
          "trend": "string"
        }
      ],
      "recommendations": [
        {
          "title": "string",
          "description": "string",
          "impact": "string",
          "difficulty": "string",
          "estimated_savings": number
        }
      ]
    }`;

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
            content: 'You are a financial analyst. Always return properly formatted JSON.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const result = await response.json();
    console.log('GPT Analysis:', result);

    try {
      return JSON.parse(result.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse GPT response:', e);
      throw new Error('Invalid analysis format received');
    }
  } catch (error) {
    console.error('Error in GPT analysis:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting file upload process...');
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user information
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Clean up old data
    console.log('Cleaning up old data...');
    await supabase.from('financial_audits').delete().eq('user_id', user.id);
    
    const { data: oldUploads } = await supabase
      .from('spreadsheet_uploads')
      .select('file_path')
      .eq('user_id', user.id);

    if (oldUploads) {
      for (const upload of oldUploads) {
        if (upload.file_path) {
          await supabase.storage.from('spreadsheets').remove([upload.file_path]);
        }
      }
      await supabase.from('spreadsheet_uploads').delete().eq('user_id', user.id);
    }

    // Read and parse file
    console.log('Reading file...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = utils.sheet_to_json(worksheet);

    console.log('Sample of parsed data:', data.slice(0, 2));

    // Analyze with GPT
    console.log('Analyzing with GPT...');
    const analysis = await analyzeWithGPT(data);
    console.log('GPT Analysis results:', analysis);

    // Store file
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error: storageError } = await supabase.storage
      .from('spreadsheets')
      .upload(fileName, file);

    if (storageError) throw storageError;

    // Create upload record
    const { error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: file.name,
        file_type: file.type,
        file_path: fileName,
        processed: true,
        row_count: data.length,
        data_summary: analysis.metrics,
        analyzed_at: new Date().toISOString()
      });

    if (uploadError) throw uploadError;

    // Create financial audit
    const monthlyMetrics = {
      revenue: analysis.metrics.total_revenue,
      profit_margin: analysis.metrics.profit_margin,
      expense_ratio: analysis.metrics.expense_ratio,
      audit_alerts: 0,
      previous_month: {
        revenue: 0,
        profit_margin: 0,
        expense_ratio: 0,
        audit_alerts: 0
      }
    };

    const { error: auditError } = await supabase
      .from('financial_audits')
      .insert({
        user_id: user.id,
        monthly_metrics: monthlyMetrics,
        audit_date: new Date().toISOString(),
        summary: analysis.summary,
        kpis: analysis.kpis,
        recommendations: analysis.recommendations
      });

    if (auditError) throw auditError;

    return new Response(
      JSON.stringify({ 
        message: 'File analyzed successfully',
        analysis 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
