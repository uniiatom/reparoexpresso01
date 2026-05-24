import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isCronRequest, invokeInternalFunction } from '../_shared/internalInvoke.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  if (!isCronRequest(req)) {
    return jsonResponse({ error: 'Unauthorized cron request' }, 401);
  }

  try {
    const supabase = getServiceClient();
    const { data: providers, error } = await supabase
      .from('providers')
      .select('id')
      .eq('is_approved', true);

    if (error) throw error;

    let processed = 0;
    for (const provider of providers ?? []) {
      await invokeInternalFunction('calculateProviderLevel', { provider_id: provider.id });
      processed += 1;
    }

    return jsonResponse({ success: true, processed });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
