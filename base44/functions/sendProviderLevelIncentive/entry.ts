import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PROVIDER_LEVELS = [
  { key: 'pro', label: 'Pro', minJobs: 120, minRating: 4 },
  { key: 'pro_plus', label: 'Pro Plus', minJobs: 160, minRating: 4 },
  { key: 'pro_elite', label: 'Pro Elite', minJobs: 190, minRating: 4 },
  { key: 'pro_lenda', label: 'Pro Lenda', minJobs: 220, minRating: 5 },
];

function getNextLevel(totalJobs, rating) {
  for (const lvl of PROVIDER_LEVELS) {
    if (totalJobs < lvl.minJobs || rating < lvl.minRating) {
      return lvl;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { providerId } = await req.json();

    if (!providerId) {
      return Response.json({ error: 'providerId required' }, { status: 400 });
    }

    const provider = await base44.entities.Provider.get(providerId);
    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    const nextLevel = getNextLevel(provider.total_jobs || 0, provider.rating || 0);
    
    if (!nextLevel) {
      return Response.json({
        success: true,
        message: `${provider.name} já atingiu o nível máximo (Pro Lenda)! 👑`,
        alreadyMaxLevel: true,
      });
    }

    const jobsNeeded = Math.max(0, nextLevel.minJobs - (provider.total_jobs || 0));
    const ratingNeeded = Math.max(0, nextLevel.minRating - (provider.rating || 0));

    const incentiveMessage = jobsNeeded === 0 && ratingNeeded === 0
      ? `🎉 ${provider.name}, você está a um passo do nível ${nextLevel.label}! Continue assim!`
      : jobsNeeded === 0
      ? `⭐ ${provider.name}, você alcançou ${nextLevel.minJobs} serviços! Precisa de ${ratingNeeded.toFixed(1)}⭐ para atingir ${nextLevel.label}.`
      : ratingNeeded === 0
      ? `💼 ${provider.name}, sua avaliação é excelente! Faltam ${jobsNeeded} serviço(s) para alcançar ${nextLevel.label}.`
      : `📈 ${provider.name}, você está progredindo! Faltam ${jobsNeeded} serviço(s) e ${ratingNeeded.toFixed(1)}⭐ para atingir ${nextLevel.label}.`;

    // Log da mensagem (em produção, isso seria enviado via email ou notificação)
    console.log(`[Incentive] ${provider.name}: ${incentiveMessage}`);

    return Response.json({
      success: true,
      providerId,
      providerName: provider.name,
      currentJobs: provider.total_jobs || 0,
      currentRating: (provider.rating || 0).toFixed(1),
      nextLevel: nextLevel.label,
      jobsNeeded,
      ratingNeeded: parseFloat(ratingNeeded.toFixed(1)),
      message: incentiveMessage,
    });
  } catch (error) {
    console.error('[sendProviderLevelIncentive]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});