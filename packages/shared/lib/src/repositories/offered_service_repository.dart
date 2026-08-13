import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/offered_service.dart';

/// Acesso ao catálogo `public.offered_services` — usado tanto pelo app
/// cliente (grid de serviços) quanto pelo prestador (especialidades).
class OfferedServiceRepository {
  OfferedServiceRepository(this._client);

  final SupabaseClient _client;

  Future<List<OfferedService>> listActive({ServiceGroup? group}) async {
    var query = _client.from('offered_services').select().eq('is_active', true);
    if (group != null) {
      query = query.eq('service_group', group.name);
    }
    final data = await query.order('sort_order');
    return data.map(OfferedService.fromJson).toList();
  }

  Future<OfferedService?> findBySlug(String slug) async {
    final data = await _client
        .from('offered_services')
        .select()
        .eq('slug', slug)
        .maybeSingle();
    return data == null ? null : OfferedService.fromJson(data);
  }

  Future<List<OfferedServiceFieldTemplate>> listFieldTemplates() async {
    final data = await _client
        .from('offered_service_field_templates')
        .select()
        .eq('is_active', true)
        .order('sort_order');
    return data.map(OfferedServiceFieldTemplate.fromJson).toList();
  }
}
