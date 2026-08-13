import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/bonus_release.dart';
import '../models/monthly_goal.dart';

/// RLS de `monthly_goals`/`bonus_releases` é staff-only (`is_staff()`).
class MonthlyGoalRepository {
  MonthlyGoalRepository(this._client);

  final SupabaseClient _client;

  Future<List<MonthlyGoal>> list() async {
    final data = await _client.from('monthly_goals').select().order('month', ascending: false);
    return data.map(MonthlyGoal.fromJson).toList();
  }

  Future<List<BonusRelease>> listReleasesFor(String month) async {
    final data = await _client.from('bonus_releases').select().eq('month', month).order('rank');
    return data.map(BonusRelease.fromJson).toList();
  }
}
