import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isCronRequest } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!isCronRequest(req)) {
    return jsonResponse({ error: 'Unauthorized cron request' }, 401);
  }

  try {
    const supabase = getServiceClient();
    const { data: alerts, error } = await supabase.from('busy_alerts').select('*');
    if (error) throw error;

    const now = new Date();
    let processed = 0;

    for (const alert of alerts ?? []) {
      const createdAt = new Date(alert.created_at);
      const ageMinutes = (now.getTime() - createdAt.getTime()) / 1000 / 60;

      if ((ageMinutes >= 5 && alert.status === 'aguardando') || ageMinutes >= 30) {
        await supabase.from('busy_alerts').update({ status: 'expirado' }).eq('id', alert.id);
        processed += 1;
      }
    }

    return jsonResponse({ processed, total: alerts?.length ?? 0 });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
