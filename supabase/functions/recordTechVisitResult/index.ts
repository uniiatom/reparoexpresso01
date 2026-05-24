import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { supabase } = auth;

    const { requestId, isFeasible, reason } = await req.json();
    if (!requestId) return jsonResponse({ error: 'requestId required' }, 400);

    const resultText = isFeasible
      ? `Viavel para instalacao. ${reason || 'Local adequado.'}`
      : `Nao viavel. ${reason || 'Motivo nao especificado.'}`;

    const { error } = await supabase
      .from('service_requests')
      .update({ tech_visit_reason: resultText })
      .eq('id', requestId);

    if (error) throw error;

    return jsonResponse({ success: true, isFeasible, resultText });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
