import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireUser } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;

    const { serviceRequestId, clientId } = await req.json();
    const supabase = getServiceClient();
    const marker = `elite_reviewer_${serviceRequestId}`;

    const { data: existing } = await supabase
      .from('loyalty_transactions')
      .select('id')
      .eq('client_id', clientId)
      .eq('description', marker)
      .limit(1);

    if (existing?.length) {
      return jsonResponse({ already_granted: true });
    }

    const { data: loyaltyRows } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('client_id', clientId)
      .limit(1);

    let loyalty = loyaltyRows?.[0];
    const newTotal = (loyalty?.total_points || 0) + 50;
    const newAvailable = (loyalty?.available_points || 0) + 50;

    if (loyalty) {
      await supabase.from('customer_loyalty').update({
        total_points: newTotal,
        available_points: newAvailable,
      }).eq('id', loyalty.id);
    } else {
      const { data: created, error } = await supabase
        .from('customer_loyalty')
        .insert({
          client_id: clientId,
          total_points: 50,
          available_points: 50,
          used_points: 0,
          tier: 'bronze',
        })
        .select()
        .single();
      if (error) throw error;
      loyalty = created;
    }

    await supabase.from('loyalty_transactions').insert({
      client_id: clientId,
      points: 50,
      type: 'earned',
      description: marker,
      reference_type: 'elite_reviewer',
      balance_after: newAvailable,
    });

    return jsonResponse({ success: true, points_granted: 50, badge: 'elite_reviewer' });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
