import { handleOptions, jsonResponse } from '../_shared/cors.ts';
import { requireUser } from '../_shared/supabase.ts';

const PROVIDER_LEVELS = [
  { key: 'prata', label: 'Prata', minJobs: 120, minRating: 4.0 },
  { key: 'ouro', label: 'Ouro', minJobs: 160, minRating: 4.0 },
  { key: 'diamante', label: 'Diamante', minJobs: 190, minRating: 4.0 },
  { key: 'rubi', label: 'Rubi', minJobs: 220, minRating: 4.5 },
];

function getNextLevel(totalJobs: number, rating: number) {
  for (const lvl of PROVIDER_LEVELS) {
    if (totalJobs < lvl.minJobs || rating < lvl.minRating) return lvl;
  }
  return null;
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const auth = await requireUser(req);
    if ('error' in auth) return auth.error;
    const { supabase } = auth;

    const { providerId } = await req.json();
    if (!providerId) return jsonResponse({ error: 'providerId required' }, 400);

    const { data: provider, error } = await supabase
      .from('providers')
      .select('id, name, rating')
      .eq('id', providerId)
      .maybeSingle();

    if (error) throw error;
    if (!provider) return jsonResponse({ error: 'Provider not found' }, 404);

    // `providers.total_jobs` não existe no schema real (ver /MIGRATION.md,
    // seção 0.1) — recalculado a partir de `service_requests`.
    const { count } = await supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('provider_id', providerId)
      .eq('status', 'concluido');
    const totalJobs = count ?? 0;
    const rating = Number(provider.rating || 0);
    const nextLevel = getNextLevel(totalJobs, rating);

    if (!nextLevel) {
      return jsonResponse({
        success: true,
        message: `${provider.name} já atingiu o nível máximo (Rubi)!`,
        alreadyMaxLevel: true,
      });
    }

    const minJobs = nextLevel.minJobs;
    const jobsNeeded = Math.max(0, minJobs - totalJobs);
    const ratingNeeded = Math.max(0, nextLevel.minRating - rating);

    let incentiveMessage = '';
    if (jobsNeeded === 0 && ratingNeeded === 0) {
      incentiveMessage = `${provider.name}, você está a um passo do nível ${nextLevel.label}!`;
    } else if (jobsNeeded === 0) {
      incentiveMessage = `${provider.name}, faltam ${ratingNeeded.toFixed(1)} estrelas para ${nextLevel.label}.`;
    } else if (ratingNeeded === 0) {
      incentiveMessage = `${provider.name}, faltam ${jobsNeeded} serviço(s) para ${nextLevel.label}.`;
    } else {
      incentiveMessage = `${provider.name}, faltam ${jobsNeeded} serviço(s) e ${ratingNeeded.toFixed(1)} estrelas para ${nextLevel.label}.`;
    }

    return jsonResponse({
      success: true,
      providerId,
      providerName: provider.name,
      currentJobs: totalJobs,
      currentRating: rating.toFixed(1),
      nextLevel: nextLevel.label,
      jobsNeeded,
      ratingNeeded: parseFloat(ratingNeeded.toFixed(1)),
      message: incentiveMessage,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Erro' }, 500);
  }
});
