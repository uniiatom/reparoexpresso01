import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const {
      service_id,
      client_email,
      service_number,
      client_name,
      provider_name,
      extra_total,
      new_total,
    } = await req.json();

    if (!client_email) return jsonResponse({ error: 'Missing required fields' }, 400);

    const supabase = getServiceClient();
    let clientId = null;

    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', auth.user.id)
      .limit(1);

    clientId = clients?.[0]?.id ?? null;

    if (service_id) {
      await supabase.from('client_notifications').insert({
        client_id: clientId,
        client_email,
        type: 'extra_charges_pending',
        service_id,
        service_number: service_number || '',
        provider_name: provider_name || '',
        extra_total: extra_total || 0,
        new_total: new_total || 0,
        title: `Orçamento Extra de R$ ${Number(extra_total || 0).toFixed(2)}`,
        message: `${provider_name || 'Prestador'} solicitou aprovação para itens adicionais`,
        is_read: false,
      });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro interno' }, 500);
  }
});
