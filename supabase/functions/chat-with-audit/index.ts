
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, auditContext } = await req.json();

    // Comprehensive platform knowledge base
    const platformInfo = `
      Platform Features and Capabilities:
      1. Financial Analysis
      - Real-time profit monitoring and analysis
      - Automated financial health checks
      - Custom KPI tracking and benchmarking
      - Detailed expense categorization and analysis
      
      2. AI-Powered Features
      - AI Assistant for financial insights
      - Predictive analytics for revenue forecasting
      - Automated audit report generation
      - Smart recommendations for profit optimization
      
      3. Integrations
      - Financial software connections (QuickBooks, Xero, etc.)
      - Payment gateway integrations
      - CRM system synchronization
      - E-commerce platform connections
      
      4. Reporting and Analytics
      - Customizable dashboard views
      - Export capabilities in multiple formats
      - Historical audit tracking
      - Trend analysis and visualization
      
      5. Security Features
      - End-to-end encryption for all data
      - Two-factor authentication (2FA)
      - Role-based access control
      - Regular security audits and compliance checks
      - Automatic session timeouts
      - Secure data backups
      
      6. Privacy Policy Highlights
      - Data collection limited to essential business information
      - No sharing of personal or financial data with third parties
      - Data retention policies following industry standards
      - User right to data deletion and export
      - Regular privacy impact assessments
      
      7. Data Protection
      - Bank-level encryption standards
      - Regular penetration testing
      - Compliance with GDPR, CCPA, and other regulations
      - Secure API endpoints
      - Regular security patches and updates
      
      8. Support and Resources
      - 24/7 customer support
      - Comprehensive documentation
      - Video tutorials and guides
      - Regular platform updates
      - Community forums and knowledge base
    `;

    // Format the context for the AI
    const systemPrompt = `You are an AI assistant for the Profit Auditor platform. 
    ${platformInfo}
    
    Current audit context:
    - Summary: ${auditContext.summary}
    - KPIs: ${JSON.stringify(auditContext.kpis)}
    - Recommendations: ${JSON.stringify(auditContext.recommendations)}
    
    Provide specific, data-driven answers based on both the platform knowledge and current audit context. When discussing features or capabilities, reference the specific sections from the platform information. Be concise but thorough, and always prioritize security and privacy in your responses. If you're unsure about any specific detail, acknowledge that and refer the user to our support team.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-with-audit function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
