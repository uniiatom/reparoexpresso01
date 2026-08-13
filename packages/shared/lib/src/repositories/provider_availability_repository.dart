import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/provider_availability.dart';

/// Porta de `legacy/src/pages/ProviderSchedule.jsx`.
class ProviderAvailabilityRepository {
  ProviderAvailabilityRepository(this._client);

  final SupabaseClient _client;

  Future<List<ProviderAvailability>> listFor(String providerId) async {
    final data = await _client
        .from('provider_availability')
        .select()
        .eq('provider_id', providerId)
        .order('day_of_week');
    return data.map(ProviderAvailability.fromJson).toList();
  }

  Future<void> upsert({
    String? id,
    required String providerId,
    required int dayOfWeek,
    required String startTime,
    required String endTime,
    bool isAvailable = true,
  }) async {
    final payload = {
      'provider_id': providerId,
      'day_of_week': dayOfWeek,
      'start_time': startTime,
      'end_time': endTime,
      'is_available': isAvailable,
    };
    if (id != null) {
      await _client.from('provider_availability').update(payload).eq('id', id);
    } else {
      await _client.from('provider_availability').insert(payload);
    }
  }

  Future<void> remove(String id) async {
    await _client.from('provider_availability').delete().eq('id', id);
  }
}
