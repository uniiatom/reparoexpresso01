import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/busy_alert.dart';

/// RLS de `busy_alerts` é staff-only (`is_staff()`).
class BusyAlertRepository {
  BusyAlertRepository(this._client);

  final SupabaseClient _client;

  Future<List<BusyAlert>> list() async {
    final data = await _client.from('busy_alerts').select().order('created_at', ascending: false);
    return data.map(BusyAlert.fromJson).toList();
  }
}
