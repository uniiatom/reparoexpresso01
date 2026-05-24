import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/supabase.ts';

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateServiceNumber(supabase: ReturnType<typeof getServiceClient>) {
  const { count } = await supabase
    .from('service_requests')
    .select('*', { count: 'exact', head: true });
  const padded = String(count ?? 0).padStart(6, '0');
  return `ATD-${padded}`;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const body = await req.json();
    const { event, data, request_id: directId } = body;
    const requestId = directId ?? event?.entity_id ?? data?.id;

    if (!requestId) return jsonResponse({ error: 'request_id ausente' }, 400);

    const supabase = getServiceClient();
    const { data: existing, error: fetchError } = await supabase
      .from('service_requests')
      .select('id, security_password, service_number')
      .eq('id', requestId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existing) return jsonResponse({ error: 'Serviço não encontrado' }, 404);
    if (existing.security_password) return jsonResponse({ skipped: true });

    const securityPassword = generatePassword();
    const validationPassword = generatePassword();
    const serviceNumber = existing.service_number || (await generateServiceNumber(supabase));

    await supabase
      .from('service_requests')
      .update({
        service_number: serviceNumber,
        security_password: securityPassword,
        validation_password: validationPassword,
        passwords_generated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    return jsonResponse({ success: true, service_number: serviceNumber });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
