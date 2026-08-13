import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_price_history_entry.dart';

/// RLS de `service_price_history` libera SELECT pra qualquer autenticado;
/// escrita é staff-only.
class ServicePriceHistoryRepository {
  ServicePriceHistoryRepository(this._client);

  final SupabaseClient _client;

  Future<List<ServicePriceHistoryEntry>> listFor(String serviceId) async {
    final data = await _client
        .from('service_price_history')
        .select()
        .eq('service_id', serviceId)
        .order('timestamp', ascending: false);
    return data.map(ServicePriceHistoryEntry.fromJson).toList();
  }
}
