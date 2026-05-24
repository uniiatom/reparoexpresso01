import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return Response.json({ error: 'request_id é obrigatório' }, { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const securityPassword = generatePassword();
    const validationPassword = generatePassword();

    const { data: serviceRequest, error: fetchError } = await supabase
      .from('service_requests')
      .select('id, provider_phone, client_phone')
      .eq('id', request_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!serviceRequest) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404, headers: corsHeaders });
    }

    const { error: updateError } = await supabase
      .from('service_requests')
      .update({
        security_password: securityPassword,
        validation_password: validationPassword,
        passwords_generated_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) throw updateError;

    return Response.json(
      {
        success: true,
        request_id,
        security_password: securityPassword,
        validation_password: validationPassword,
        sent_to_provider: !!serviceRequest.provider_phone,
        sent_to_client: !!serviceRequest.client_phone,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500, headers: corsHeaders },
    );
  }
});
