
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      throw new Error('No file uploaded');
    }

    // Validate file
    if (!(file instanceof File)) {
      throw new Error('Invalid file format');
    }

    console.log('Processing file:', file.name, 'Type:', file.type);

    // Get file contents as text
    const fileContent = await file.text();
    console.log('File content length:', fileContent.length);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Generate safe filename
    const timestamp = new Date().toISOString();
    const sanitizedFilename = file.name.replace(/[^\x00-\x7F]/g, '');
    const fileExtension = sanitizedFilename.split('.').pop()?.toLowerCase() || '';
    const storagePath = `${user.id}/${timestamp}-${sanitizedFilename}`;

    // Upload file to storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('spreadsheets')
      .upload(storagePath, fileContent, {
        contentType: file.type,
        upsert: false
      });

    if (storageError) {
      console.error('Storage error:', storageError);
      throw new Error(`Failed to upload file: ${storageError.message}`);
    }

    // Create database record
    const { data: uploadData, error: uploadError } = await supabase
      .from('spreadsheet_uploads')
      .insert({
        user_id: user.id,
        filename: sanitizedFilename,
        file_type: fileExtension,
        file_path: storagePath,
        processed: false,
        row_count: fileContent.split('\n').length - 1,
        data_summary: {
          content_type: file.type,
          size: file.size,
          upload_timestamp: timestamp
        }
      })
      .select()
      .single();

    if (uploadError) {
      console.error('Database error:', uploadError);
      throw new Error(`Failed to create upload record: ${uploadError.message}`);
    }

    return new Response(
      JSON.stringify({
        message: 'File uploaded successfully',
        upload: uploadData
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
