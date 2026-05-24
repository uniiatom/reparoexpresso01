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
    const { data: bonuses, error } = await supabase
      .from('wallet_bonuses')
      .select('*')
      .eq('validation_status', 'validated')
      .eq('is_used', false);

    if (error) throw error;

    let credited = 0;
    for (const bonus of bonuses ?? []) {
      const result = await invokeInternalFunction('creditBonusToWallet', { bonusId: bonus.id });
      if (result?.success) credited += 1;
    }

    return jsonResponse({ success: true, processed: bonuses?.length ?? 0, credited });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
