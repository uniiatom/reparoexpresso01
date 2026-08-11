import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ACHIEVEMENTS_DATA = [
  // Serviços
  { key: 'first_job', name: 'Primeiro Passo', description: 'Complete seu primeiro serviço', icon: '👣', category: 'jobs', requirement_type: 'jobs_completed', requirement_value: 1, visibility_bonus: 0 },
  { key: 'five_jobs', name: 'Começando', description: 'Complete 5 serviços', icon: '🎯', category: 'jobs', requirement_type: 'jobs_completed', requirement_value: 5, visibility_bonus: 2 },
  { key: 'twenty_jobs', name: 'Profissional', description: 'Complete 20 serviços', icon: '⚙️', category: 'jobs', requirement_type: 'jobs_completed', requirement_value: 20, visibility_bonus: 3 },
  { key: 'fifty_jobs', name: 'Veterano', description: 'Complete 50 serviços', icon: '🛡️', category: 'jobs', requirement_type: 'jobs_completed', requirement_value: 50, visibility_bonus: 5 },
  { key: 'hundred_jobs', name: 'Centésimo', description: 'Complete 100 serviços', icon: '💯', category: 'jobs', requirement_type: 'jobs_completed', requirement_value: 100, visibility_bonus: 8 },

  // Avaliações
  { key: 'perfect_rating', name: 'Perfeição', description: 'Receba 5 avaliações de 5 ⭐', icon: '⭐', category: 'rating', requirement_type: 'jobs_with_perfect_rating', requirement_value: 5, visibility_bonus: 2 },
  { key: 'ten_perfect_ratings', name: 'Consistência', description: 'Receba 10 avaliações de 5 ⭐', icon: '✨', category: 'rating', requirement_type: 'jobs_with_perfect_rating', requirement_value: 10, visibility_bonus: 4 },
  { key: 'excellent_service', name: 'Excelência', description: 'Mantenha 4.8+ de avaliação', icon: '🌟', category: 'rating', requirement_type: 'average_rating', requirement_value: 4.8, visibility_bonus: 5 },
  { key: 'outstanding', name: 'Destaque', description: 'Mantenha 4.9+ de avaliação', icon: '👑', category: 'rating', requirement_type: 'average_rating', requirement_value: 4.9, visibility_bonus: 8 },

  // Marcos
  { key: 'level_2', name: 'Prata Alcançada', description: 'Alcance nível 2', icon: '🥈', category: 'milestone', requirement_type: 'jobs_completed', requirement_value: 5, visibility_bonus: 0 },
  { key: 'level_3', name: 'Ouro Alcançado', description: 'Alcance nível 3', icon: '🏅', category: 'milestone', requirement_type: 'jobs_completed', requirement_value: 20, visibility_bonus: 0 },
  { key: 'level_4', name: 'Platina Alcançada', description: 'Alcance nível 4', icon: '💎', category: 'milestone', requirement_type: 'jobs_completed', requirement_value: 50, visibility_bonus: 0 },
  { key: 'level_5', name: 'Lendário', description: 'Alcance nível 5', icon: '⭐', category: 'milestone', requirement_type: 'jobs_completed', requirement_value: 100, visibility_bonus: 0 },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verifica se já existem conquistas
    const existing = await base44.asServiceRole.entities.Achievement.list();
    
    if (existing.length > 0) {
      return Response.json({
        success: true,
        message: 'Conquistas já foram inicializadas',
        count: existing.length
      });
    }

    // Cria todas as conquistas
    await Promise.all(
      ACHIEVEMENTS_DATA.map(data =>
        base44.asServiceRole.entities.Achievement.create(data)
      )
    );

    console.log(`✓ ${ACHIEVEMENTS_DATA.length} conquistas inicializadas com sucesso`);

    return Response.json({
      success: true,
      message: 'Conquistas inicializadas com sucesso',
      count: ACHIEVEMENTS_DATA.length
    });
  } catch (error) {
    console.error('Erro ao inicializar conquistas:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});