import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_part.dart';
import '../models/surcharge_rule.dart';

/// RLS de `service_parts`/`surcharge_rules` libera SELECT pra qualquer
/// autenticado; escrita é admin-only.
class ServicePartRepository {
  ServicePartRepository(this._client);

  final SupabaseClient _client;

  Future<List<ServicePart>> listActive({String? serviceType}) async {
    var query = _client.from('service_parts').select().eq('is_active', true);
    if (serviceType != null) query = query.eq('service_type', serviceType);
    final data = await query.order('name');
    return data.map(ServicePart.fromJson).toList();
  }

  Future<List<SurchargeRule>> listActiveSurchargeRules() async {
    final data = await _client.from('surcharge_rules').select().eq('is_active', true);
    return data.map(SurchargeRule.fromJson).toList();
  }
}
