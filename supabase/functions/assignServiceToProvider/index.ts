import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { request_id, provider_id } = await req.json();
    if (!request_id || !provider_id) {
      return jsonResponse({ error: 'request_id e provider_id são obrigatórios' }, 400);
    }

    const supabase = getServiceClient();

    const { data: service, error: serviceError } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', request_id)
      .maybeSingle();

    if (serviceError) throw serviceError;
    if (!service) return jsonResponse({ error: 'Serviço não encontrado' }, 404);

    const { data: provider, error: providerError } = await supabase
      .from('providers')
      .select('*')
      .eq('id', provider_id)
      .maybeSingle();

    if (providerError) throw providerError;
    if (!provider) return jsonResponse({ error: 'Prestador não encontrado' }, 404);

  const isScheduled = service.modality === 'agendado';
    const updateData: Record<string, unknown> = {
      provider_id: provider.id,
      provider_name: provider.name,
      provider_phone: provider.phone,
      status: isScheduled ? 'agendado' : 'aceito',
    };

    if (provider.latitude != null) updateData.provider_latitude = provider.latitude;
    if (provider.longitude != null) updateData.provider_longitude = provider.longitude;

    const { error: updateError } = await supabase
      .from('service_requests')
      .update(updateData)
      .eq('id', request_id);

    if (updateError) throw updateError;

    return jsonResponse({
      success: true,
      provider_id: provider.id,
      provider_name: provider.name,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
