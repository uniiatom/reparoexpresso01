import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/service_status_transition.dart';

/// RLS de `service_status_transitions` é staff-only (`is_staff()`) — as
/// linhas são gravadas por trigger no banco, não pela aplicação (ver
/// migration `20260601160000_service_status_transitions.sql`).
class ServiceStatusTransitionRepository {
  ServiceStatusTransitionRepository(this._client);

  final SupabaseClient _client;

  /// Todas as transições — usado pelo admin pra calcular tempo médio de
  /// aceite/chegada/execução (ver `analytics_tab.dart`). Sem paginação
  /// ainda, mesma limitação de `listAllForStaff()`.
  Future<List<ServiceStatusTransition>> listAll() async {
    final data = await _client
        .from('service_status_transitions')
        .select()
        .order('changed_at');
    return data.map(ServiceStatusTransition.fromJson).toList();
  }

  /// Transições das OS informadas — usado pelo prestador pra calcular o
  /// próprio tempo médio de aceite/chegada (RLS libera dono da OS, ver
  /// `service_status_transitions_owner`).
  Future<List<ServiceStatusTransition>> listForRequests(List<String> serviceRequestIds) async {
    if (serviceRequestIds.isEmpty) return const [];
    final data = await _client
        .from('service_status_transitions')
        .select()
        .inFilter('service_request_id', serviceRequestIds)
        .order('changed_at');
    return data.map(ServiceStatusTransition.fromJson).toList();
  }
}
