import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/provider_unavailability.dart';

/// Mesma política de RLS de `provider_availability`: dono do cadastro
/// (`providers.user_id = auth.uid()`) ou admin.
class ProviderUnavailabilityRepository {
  ProviderUnavailabilityRepository(this._client);

  final SupabaseClient _client;

  Future<List<ProviderUnavailability>> listFor(String providerId) async {
    final data = await _client
        .from('provider_unavailability')
        .select()
        .eq('provider_id', providerId)
        .order('start_date');
    return data.map(ProviderUnavailability.fromJson).toList();
  }

  Future<void> create({
    required String providerId,
    required DateTime startDate,
    required DateTime endDate,
    String? reason,
  }) async {
    await _client.from('provider_unavailability').insert({
      'provider_id': providerId,
      'start_date': startDate.toIso8601String().split('T').first,
      'end_date': endDate.toIso8601String().split('T').first,
      'reason': reason,
    });
  }

  Future<void> remove(String id) async {
    await _client.from('provider_unavailability').delete().eq('id', id);
  }
}
