import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/preventive_service_reminder.dart';

/// Porta de `legacy/src/components/PreventiveServiceAlarmForm/List.jsx`.
class PreventiveServiceReminderRepository {
  PreventiveServiceReminderRepository(this._client);

  final SupabaseClient _client;

  Future<List<PreventiveServiceReminder>> listMine() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const [];
    final data = await _client
        .from('preventive_service_reminders')
        .select()
        .eq('client_id', uid)
        .order('next_reminder_date');
    return data.map(PreventiveServiceReminder.fromJson).toList();
  }

  Future<void> create({
    required String serviceType,
    required int reminderIntervalDays,
    required String reminderIntervalLabel,
    String? notes,
  }) async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) throw StateError('Não autenticado');
    await _client.from('preventive_service_reminders').insert({
      'client_id': uid,
      'service_type': serviceType,
      'reminder_interval_days': reminderIntervalDays,
      'reminder_interval_label': reminderIntervalLabel,
      'next_reminder_date':
          DateTime.now().add(Duration(days: reminderIntervalDays)).toIso8601String().split('T').first,
      'notes': ?notes,
    });
  }

  Future<void> setActive(String id, bool isActive) async {
    await _client.from('preventive_service_reminders').update({'is_active': isActive}).eq('id', id);
  }
}
