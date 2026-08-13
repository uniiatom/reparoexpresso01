import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/provider_achievement.dart';

/// Porta de `legacy/src/pages/ProviderAwards.jsx` (leitura).
class ProviderAchievementRepository {
  ProviderAchievementRepository(this._client);

  final SupabaseClient _client;

  Future<ProviderAchievement?> findByProviderId(String providerId) async {
    final data = await _client
        .from('provider_achievements')
        .select()
        .eq('provider_id', providerId)
        .maybeSingle();
    return data == null ? null : ProviderAchievement.fromJson(data);
  }

  /// Ranking público por volume/nota — mesma leitura usada no legado pra
  /// mostrar posição do prestador entre os pares.
  Future<List<ProviderAchievement>> listTopRanked({int limit = 20}) async {
    final data = await _client
        .from('provider_achievements')
        .select()
        .order('total_jobs_completed', ascending: false)
        .limit(limit);
    return data.map(ProviderAchievement.fromJson).toList();
  }
}
