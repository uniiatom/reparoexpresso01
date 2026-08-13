import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/recurring_service_schedule.dart';

/// Porta de `legacy/src/components/RecurringServiceForm/List.jsx`.
class RecurringServiceRepository {
  RecurringServiceRepository(this._client);

  final SupabaseClient _client;

  Future<List<RecurringServiceSchedule>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('recurring_service_schedules')
        .select('*, professions(name), sub_services(name)')
        .eq('client_id', uid)
        .order('next_service_date');
    return data.map(RecurringServiceSchedule.fromJson).toList();
  }

  Future<void> create({
    required String professionId,
    String? subServiceId,
    required String recurrencePattern,
    required DateTime startDate,
    String? address,
    String? city,
    String? state,
    String? notes,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Não autenticado');
    await _client.from('recurring_service_schedules').insert({
      'client_id': uid,
      'profession_id': professionId,
      'sub_service_id': ?subServiceId,
      'recurrence_pattern': recurrencePattern,
      'start_date': startDate.toIso8601String().split('T').first,
      'next_service_date': startDate.toIso8601String().split('T').first,
      'address': ?address,
      'city': ?city,
      'state': ?state,
      'notes': ?notes,
    });
  }

  Future<void> cancel(String id) async {
    await _client.from('recurring_service_schedules').update({'is_active': false}).eq('id', id);
  }
}
