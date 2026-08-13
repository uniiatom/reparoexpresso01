import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/client_notification.dart';

/// Porta de `legacy/src/components/NotificationCenter.jsx`.
class ClientNotificationRepository {
  ClientNotificationRepository(this._client);

  final SupabaseClient _client;

  Stream<List<ClientNotification>> watchMine() {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return const Stream.empty();
    return _client
        .from('client_notifications')
        .stream(primaryKey: ['id'])
        .eq('client_id', uid)
        .order('created_at', ascending: false)
        .map((rows) => rows.map(ClientNotification.fromJson).toList());
  }

  Future<void> markAsRead(String id) async {
    await _client
        .from('client_notifications')
        .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()}).eq('id', id);
  }

  Future<void> markAllAsRead() async {
    final uid = _client.auth.currentUser?.id;
    if (uid == null) return;
    await _client
        .from('client_notifications')
        .update({'is_read': true, 'read_at': DateTime.now().toIso8601String()})
        .eq('client_id', uid)
        .eq('is_read', false);
  }
}
