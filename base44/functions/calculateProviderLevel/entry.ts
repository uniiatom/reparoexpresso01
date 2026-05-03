import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;
    
    // Se vem de automação entity
    let provider_id = data?.provider_id;
    
    // Se vem de chamada direta
    if (!provider_id && body.provider_id) {
      provider_id = body.provider_id;
    }

    if (!provider_id) {
      return Response.json({ error: 'provider_id is required' }, { status: 400 });
    }

    // Busca o prestador
    const providers = await base44.asServiceRole.entities.Provider.filter({ id: provider_id });
    const provider = providers[0];

    if (!provider) {
      return Response.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Busca todos os serviços concluídos do prestador
    const completedServices = await base44.asServiceRole.entities.ServiceRequest.filter({
      provider_id: provider_id,
      status: 'concluido'
    });

    // Calcula a avaliação média
    const withRatings = completedServices.filter(s => s.rating_client);
    const averageRating = withRatings.length > 0
      ? withRatings.reduce((sum, s) => sum + s.rating_client, 0) / withRatings.length
      : 5;

    // Determina o nível baseado em serviços concluídos e avaliação
    const totalJobs = completedServices.length;
    let level = 1;

    if (totalJobs >= 100 && averageRating >= 4.8) level = 5;
    else if (totalJobs >= 50 && averageRating >= 4.7) level = 4;
    else if (totalJobs >= 20 && averageRating >= 4.6) level = 3;
    else if (totalJobs >= 5 && averageRating >= 4.5) level = 2;

    // Calcula bônus de visibilidade por nível
    const visibilityBonusMap = {
      1: 0,
      2: 5,
      3: 10,
      4: 15,
      5: 25
    };

    // Busca ou cria registro de conquistas
    const achievements = await base44.asServiceRole.entities.ProviderAchievement.filter({ provider_id });
    const oldAchievement = achievements[0];

    // Busca todas as conquistas possíveis
    const allAchievements = await base44.asServiceRole.entities.Achievement.list();
    const unlockedAchievements = [];

    // Verifica cada conquista
    for (const achievement of allAchievements) {
      let isUnlocked = false;

      if (achievement.requirement_type === 'jobs_completed') {
        isUnlocked = totalJobs >= achievement.requirement_value;
      } else if (achievement.requirement_type === 'average_rating') {
        isUnlocked = averageRating >= achievement.requirement_value;
      } else if (achievement.requirement_type === 'jobs_with_perfect_rating') {
        const perfectRatings = withRatings.filter(s => s.rating_client === 5).length;
        isUnlocked = perfectRatings >= achievement.requirement_value;
      }

      if (isUnlocked) {
        unlockedAchievements.push(achievement.key);
      }
    }

    // Atualiza ou cria ProviderAchievement
    if (oldAchievement) {
      const oldLevel = oldAchievement.level;
      await base44.asServiceRole.entities.ProviderAchievement.update(oldAchievement.id, {
        level,
        total_jobs_completed: totalJobs,
        average_rating: parseFloat(averageRating.toFixed(2)),
        achievements_unlocked: unlockedAchievements,
        visibility_bonus_percent: visibilityBonusMap[level],
        is_featured: level === 5,
        level_up_date: oldLevel !== level ? new Date().toISOString() : oldAchievement.level_up_date,
      });

      // Log de promoção
      if (oldLevel < level) {
        console.log(`✓ Prestador ${provider.name} promovido: nível ${oldLevel} → ${level}`);
      }
    } else {
      await base44.asServiceRole.entities.ProviderAchievement.create({
        provider_id,
        provider_name: provider.name,
        level,
        total_jobs_completed: totalJobs,
        average_rating: parseFloat(averageRating.toFixed(2)),
        achievements_unlocked: unlockedAchievements,
        visibility_bonus_percent: visibilityBonusMap[level],
        is_featured: level === 5,
        level_up_date: new Date().toISOString(),
      });

      console.log(`✓ Registro de conquistas criado para prestador ${provider.name}`);
    }

    return Response.json({
      success: true,
      provider_id,
      level,
      total_jobs_completed: totalJobs,
      average_rating: parseFloat(averageRating.toFixed(2)),
      achievements_unlocked: unlockedAchievements.length,
      visibility_bonus_percent: visibilityBonusMap[level],
    });
  } catch (error) {
    console.error('Erro ao calcular nível:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});