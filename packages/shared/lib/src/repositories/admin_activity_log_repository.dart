import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/admin_activity_log.dart';

/// Porta de `legacy/src/components/admin/ActivityLog.jsx`.
class AdminActivityLogRepository {
  AdminActivityLogRepository(this._client);

  final SupabaseClient _client;

  Future<List<AdminActivityLog>> listRecent({int limit = 100}) async {
    final data = await _client
        .from('admin_activity_logs')
        .select()
        .order('created_at', ascending: false)
        .limit(limit);
    return data.map(AdminActivityLog.fromJson).toList();
  }
}
