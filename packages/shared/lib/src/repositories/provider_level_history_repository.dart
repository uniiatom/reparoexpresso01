import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/provider_level_history.dart';

/// RLS de `provider_level_history` libera SELECT pra qualquer autenticado.
class ProviderLevelHistoryRepository {
  ProviderLevelHistoryRepository(this._client);

  final SupabaseClient _client;

  Future<List<ProviderLevelHistory>> listFor(String providerId) async {
    final data = await _client
        .from('provider_level_history')
        .select()
        .eq('provider_id', providerId)
        .order('mudanca_em', ascending: false);
    return data.map(ProviderLevelHistory.fromJson).toList();
  }
}
