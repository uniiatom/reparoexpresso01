import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Bronze:   0–119 serviços (sem requisito de nota)
// Prata:    120–159 serviços + 4.0+ estrelas
// Ouro:     160–189 serviços + 4.0+ estrelas
// Diamante: 190–219 serviços + 4.0+ estrelas
// Rubi:     220+ serviços + 4.5+ estrelas
function calcLevel(totalJobs, averageRating) {
  if (totalJobs >= 220 && averageRating >= 4.5) return 5;
  if (totalJobs >= 190 && averageRating >= 4.0) return 4;
  if (totalJobs >= 160 && averageRating >= 4.0) return 3;
  if (totalJobs >= 120 && averageRating >= 4.0) return 2;
  return 1;
}

const visibilityBonusMap = { 1: 0, 2: 5, 3: 10, 4: 15, 5: 25 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Busca todos os achievements
    const achievements = await base44.asServiceRole.entities.ProviderAchievement.list();
    console.log(`[recalcAll] ${achievements.length} registros encontrados`);

    let updated = 0;
    let errors = 0;

    for (const ach of achievements) {
      try {
        // Busca serviços concluídos do prestador
        const services = await base44.asServiceRole.entities.ServiceRequest.filter({
          provider_id: ach.provider_id,
          status: 'concluido'
        });

        const withRatings = services.filter(s => s.rating_client);
        const avgRating = withRatings.length > 0
          ? withRatings.reduce((sum, s) => sum + s.rating_client, 0) / withRatings.length
          : 5;

        const totalJobs = services.length;
        const level = calcLevel(totalJobs, avgRating);

        await base44.asServiceRole.entities.ProviderAchievement.update(ach.id, {
          level,
          total_jobs_completed: totalJobs,
          average_rating: parseFloat(avgRating.toFixed(2)),
          visibility_bonus_percent: visibilityBonusMap[level],
          is_featured: level >= 4,
        });

        console.log(`✓ ${ach.provider_name}: ${totalJobs} serviços, ${avgRating.toFixed(1)}⭐ → nível ${level}`);
        updated++;
      } catch (err) {
        console.error(`✗ Erro em ${ach.provider_id}:`, err.message);
        errors++;
      }
    }

    return Response.json({ success: true, updated, errors, total: achievements.length });
  } catch (error) {
    console.error('[recalcAll]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});