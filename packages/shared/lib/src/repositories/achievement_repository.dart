import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/achievement.dart';

/// RLS de `achievements` libera SELECT pra qualquer autenticado.
class AchievementRepository {
  AchievementRepository(this._client);

  final SupabaseClient _client;

  Future<List<Achievement>> list() async {
    final data = await _client.from('achievements').select().order('category');
    return data.map(Achievement.fromJson).toList();
  }
}
