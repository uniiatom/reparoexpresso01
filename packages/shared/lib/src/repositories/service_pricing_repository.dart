import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_pricing.dart';

/// Porta de `legacy/src/components/admin/ServicePricing.jsx`.
class ServicePricingRepository {
  ServicePricingRepository(this._client);

  final SupabaseClient _client;

  Future<List<ServicePricing>> listAll() async {
    final data = await _client.from('service_pricing').select().order('service_type');
    return data.map(ServicePricing.fromJson).toList();
  }

  Future<void> upsert({
    String? id,
    required String serviceType,
    num? priceMin,
    num? priceMax,
    String? note,
    String? city,
    String? zone,
  }) async {
    final payload = {
      'service_type': serviceType,
      'price_min': priceMin,
      'price_max': priceMax,
      'note': note,
      'city': city,
      'zone': zone,
    };
    if (id != null) {
      await _client.from('service_pricing').update(payload).eq('id', id);
    } else {
      await _client.from('service_pricing').insert(payload);
    }
  }
}
