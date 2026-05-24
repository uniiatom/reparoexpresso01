import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const { providerId, title, message, data } = await req.json();
    if (!providerId) return jsonResponse({ error: 'providerId obrigatório' }, 400);

    const supabase = getServiceClient();
    await supabase.from('provider_notifications').insert({
      provider_id: providerId,
      type: data?.type || 'push',
      title: title || 'Novo alerta',
      message: message || '',
      action_url: data?.action_url || null,
    });

    const { data: provider } = await supabase
      .from('providers')
      .select('push_subscription, name')
      .eq('id', providerId)
      .maybeSingle();

    if (!provider?.push_subscription) {
      return jsonResponse({ success: true, skipped: true, reason: 'sem subscription' });
    }

    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublic || !vapidPrivate) {
      return jsonResponse({ success: true, notification_saved: true, push_skipped: 'VAPID não configurado' });
    }

    try {
      const subscription = JSON.parse(provider.push_subscription);
      const res = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', TTL: '86400' },
        body: JSON.stringify({ title, message, data: data || {} }),
      });

      if (res.status === 410 || res.status === 404) {
        await supabase.from('providers').update({ push_subscription: null }).eq('id', providerId);
      }

      return jsonResponse({ success: true, statusCode: res.status });
    } catch {
      return jsonResponse({ success: true, notification_saved: true, push_failed: true });
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
