import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, isServiceRoleRequest } from '../_shared/internalInvoke.ts';

const VISIBILITY_BONUS: Record<number, number> = { 1: 0, 2: 5, 3: 10, 4: 15, 5: 25 };
const LEVEL_NAMES: Record<number, string> = {
  1: 'Bronze', 2: 'Prata', 3: 'Ouro', 4: 'Diamante', 5: 'Rubi',
};

function resolveLevel(totalJobs: number, averageRating: number) {
  if (totalJobs >= 220 && averageRating >= 4.5) return 5;
  if (totalJobs >= 190 && averageRating >= 4.0) return 4;
  if (totalJobs >= 160 && averageRating >= 4.0) return 3;
  if (totalJobs >= 120 && averageRating >= 4.0) return 2;
  return 1;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  // Só chamada internamente (recalcAllProviderLevels, updateProviderJobCount)
  // via invokeInternalFunction com a service role key — nenhum app cliente
  // chama isso direto.
  if (!isServiceRoleRequest(req)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  try {
    const body = await req.json();
    const providerId = body.provider_id ?? body.event?.data?.provider_id ?? body.data?.provider_id;
    if (!providerId) return jsonResponse({ error: 'provider_id is required' }, 400);

    const supabase = getServiceClient();
    const { data: provider } = await supabase
      .from('providers')
      .select('id, name, rating')
      .eq('id', providerId)
      .maybeSingle();

    if (!provider) return jsonResponse({ error: 'Provider not found' }, 404);

    const { data: completedServices } = await supabase
      .from('service_requests')
      .select('rating_client')
      .eq('provider_id', providerId)
      .eq('status', 'concluido');

    const withRatings = (completedServices ?? []).filter((s) => s.rating_client);
    const averageRating = withRatings.length
      ? withRatings.reduce((sum, s) => sum + Number(s.rating_client), 0) / withRatings.length
      : Number(provider.rating || 5);

    // `providers.total_jobs` não existe no schema real (ver /MIGRATION.md,
    // seção 0.1) — sempre recalculado a partir de `service_requests`.
    const totalJobs = completedServices?.length ?? 0;
    const level = resolveLevel(totalJobs, averageRating);

    const { data: existing } = await supabase
      .from('provider_achievements')
      .select('*')
      .eq('provider_id', providerId)
      .limit(1);

    const oldLevel = existing?.[0]?.level ?? 1;
    const payload = {
      provider_id: providerId,
      provider_name: provider.name,
      level,
      total_jobs_completed: totalJobs,
      average_rating: parseFloat(averageRating.toFixed(2)),
      visibility_bonus_percent: VISIBILITY_BONUS[level],
      is_featured: level >= 4,
      level_up_date: oldLevel !== level ? new Date().toISOString() : existing?.[0]?.level_up_date,
    };

    if (existing?.[0]) {
      await supabase.from('provider_achievements').update(payload).eq('id', existing[0].id);
    } else {
      await supabase.from('provider_achievements').insert(payload);
    }

    if (existing?.[0] && oldLevel !== level) {
      await supabase.from('provider_level_history').insert({
        provider_id: providerId,
        provider_name: provider.name,
        nivel_anterior: LEVEL_NAMES[oldLevel],
        nivel_novo: LEVEL_NAMES[level],
        direcao: level > oldLevel ? 'subiu' : 'desceu',
        total_jobs_na_mudanca: totalJobs,
        rating_na_mudanca: parseFloat(averageRating.toFixed(2)),
      });
    }

    return jsonResponse({
      success: true,
      provider_id: providerId,
      level,
      total_jobs_completed: totalJobs,
      average_rating: parseFloat(averageRating.toFixed(2)),
      visibility_bonus_percent: VISIBILITY_BONUS[level],
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
