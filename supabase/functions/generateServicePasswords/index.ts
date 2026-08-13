import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { user, supabase } = auth;

    const { request_id } = await req.json();
    if (!request_id) {
      return jsonResponse({ error: 'request_id é obrigatório' }, 400);
    }

    const { data: serviceRequest, error: fetchError } = await supabase
      .from('service_requests')
      .select('id, client_id, created_by, provider_id, provider_phone, client_phone')
      .eq('id', request_id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!serviceRequest) {
      return jsonResponse({ error: 'Solicitação não encontrada' }, 404);
    }

    // Só o cliente dono da OS, o prestador atribuído, ou admin — os
    // códigos de segurança validam a execução do serviço presencialmente,
    // não podem vazar pra qualquer autenticado (ver /MIGRATION.md, Fase 6).
    // `service_requests.client_id` é `clients.id`, não `auth.uid()` — resolve
    // o dono via `clients.user_id` (checagem por `created_by`/email fica de
    // reforço, caso essa coluna esteja preenchida por outro fluxo).
    let isOwner = serviceRequest.created_by === user.email;
    if (!isOwner && serviceRequest.client_id) {
      const { data: clientRow } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', serviceRequest.client_id)
        .maybeSingle();
      isOwner = clientRow?.user_id === user.id;
    }
    if (!isOwner && serviceRequest.provider_id) {
      const { data: providers } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', serviceRequest.provider_id)
        .limit(1);
      isOwner = !!providers?.length;
    }
    if (!isOwner && user.role !== 'admin') {
      return jsonResponse({ error: 'Acesso negado' }, 403);
    }

    const securityPassword = generatePassword();
    const validationPassword = generatePassword();

    const { error: updateError } = await supabase
      .from('service_requests')
      .update({
        security_password: securityPassword,
        validation_password: validationPassword,
        passwords_generated_at: new Date().toISOString(),
      })
      .eq('id', request_id);

    if (updateError) throw updateError;

    return jsonResponse({
      success: true,
      request_id,
      security_password: securityPassword,
      validation_password: validationPassword,
      sent_to_provider: !!serviceRequest.provider_phone,
      sent_to_client: !!serviceRequest.client_phone,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
